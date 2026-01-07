use std::{
    cell::RefCell,
    rc::{Rc, Weak},
};

pub type TaskRc = Rc<RefCell<Task>>;
pub type TaskWeak = Weak<RefCell<Task>>;

#[derive(Debug)]
pub struct Task {
    pub title: String,
    pub is_completed: bool,
    pub subtasks: Vec<TaskRc>,
    pub parent: Option<TaskWeak>,
}

impl PartialEq for Task {
    fn eq(&self, other: &Self) -> bool {
        self.title == other.title
            && self.is_completed == other.is_completed
            && self.subtasks == other.subtasks
            && self.parent.as_ref().and_then(|weak| weak.upgrade())
                == other.parent.as_ref().and_then(|weak| weak.upgrade())
    }
}

impl Task {
    pub fn new(title: &str) -> TaskRc {
        Rc::new(RefCell::new(Self {
            title: title.to_string(),
            is_completed: false,
            subtasks: vec![],
            parent: None,
        }))
    }

    pub fn add_subtask(self_rc: &TaskRc, subtask: &TaskRc) {
        self_rc.borrow_mut().subtasks.push(subtask.clone());
        subtask.borrow_mut().parent = Some(Rc::downgrade(self_rc));
    }

    pub fn move_to(self_rc: &TaskRc, new_parent: &TaskRc) -> Result<(), String> {
        // Get current parent
        let parent = self_rc
            .borrow()
            .parent
            .as_ref()
            .and_then(|weak| weak.upgrade());

        // Remove from current parent (without deleting subtasks)
        if let Some(parent) = parent {
            parent
                .borrow_mut()
                .subtasks
                .retain(|task| !Rc::ptr_eq(task, self_rc));
        } else {
            return Err(format!("Task {} has no parent", self_rc.borrow().title));
        }

        // Clear parent reference
        self_rc.borrow_mut().parent = None;

        // Add to new parent
        Self::add_subtask(new_parent, self_rc);

        Ok(())
    }

    pub fn delete_self(self_rc: &TaskRc) -> Result<(), String> {
        // Recursively delete all subtasks
        for subtask in self_rc.borrow_mut().subtasks.iter_mut() {
            // For subtasks we just clear parent and recursively delete their subtasks
            subtask.borrow_mut().parent = None;
            // Call deletion of content (but not from parent, since parent = None)
            Self::delete_subtasks(&subtask);
        }

        // Clear subtasks list
        self_rc.borrow_mut().subtasks.clear();

        // Get parent and save it separately
        let parent = {
            let borrowed = self_rc.borrow();
            borrowed.parent.as_ref().and_then(|weak| weak.upgrade())
        };

        // Delete yourself from parent
        if let Some(parent) = parent {
            // Find yourself in parent's subtasks and delete
            parent
                .borrow_mut()
                .subtasks
                .retain(|task| !Rc::ptr_eq(task, self_rc));

            // Clear parent reference
            self_rc.borrow_mut().parent = None;

            return Ok(());
        }

        Err(format!("Task {} has no parent", self_rc.borrow().title))
    }

    pub fn delete_subtasks(self_rc: &TaskRc) {
        for subtask in self_rc.borrow_mut().subtasks.iter_mut() {
            subtask.borrow_mut().parent = None;
            Self::delete_subtasks(&subtask);
        }

        self_rc.borrow_mut().subtasks.clear();
    }

    pub fn complete(&mut self) {
        self.is_completed = true;

        for subtask in self.subtasks.iter() {
            subtask.borrow_mut().complete();
        }
    }

    pub fn get_path(&self) -> Vec<String> {
        let mut path = vec![self.title.clone()];
        let mut current_parent = self.parent.as_ref().and_then(|weak| weak.upgrade());

        while let Some(parent) = current_parent {
            let borrowed = parent.borrow();
            path.push(borrowed.title.clone());
            current_parent = borrowed.parent.as_ref().and_then(|weak| weak.upgrade());
        }

        path.reverse();
        path
    }

    pub fn get_depth(&self) -> usize {
        let mut depth = 0;
        let mut current_parent = self.parent.as_ref().and_then(|weak| weak.upgrade());

        while let Some(parent) = current_parent {
            depth += 1;
            let borrowed = parent.borrow();
            current_parent = borrowed.parent.as_ref().and_then(|weak| weak.upgrade());
        }

        depth
    }

    pub fn get_root(&self) -> Option<TaskRc> {
        let mut current_parent = self.parent.as_ref().and_then(|weak| weak.upgrade())?;

        loop {
            let next = {
                let borrowed = current_parent.borrow();
                borrowed.parent.as_ref().and_then(|weak| weak.upgrade())
            };

            match next {
                Some(parent) => current_parent = parent,
                None => return Some(current_parent),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new() {
        let root = Task::new("Root");
        assert_eq!(root.borrow().title, "Root");
    }

    #[test]
    fn test_add_subtask() {
        let root = Task::new("Root");
        let subtask = Task::new("Subtask");

        Task::add_subtask(&root, &subtask);

        assert_eq!(root.borrow().subtasks.len(), 1);
        assert_eq!(subtask.borrow().title, "Subtask");
    }

    #[test]
    fn test_move_to() {
        let root = Task::new("Root");
        let child = Task::new("Child");
        let grandchild = Task::new("Grandchild");

        Task::add_subtask(&root, &child);
        Task::add_subtask(&child, &grandchild);
        let result = Task::move_to(&grandchild, &root);

        assert!(result.is_ok());
        // Check if Grandchild has Root as parent
        assert_eq!(
            grandchild
                .borrow()
                .parent
                .as_ref()
                .and_then(|weak| weak.upgrade())
                .unwrap()
                .borrow()
                .title,
            "Root"
        );
        // Check if Grandchild is now a child of Root
        assert!(
            root.borrow()
                .subtasks
                .iter()
                .any(|task| Rc::ptr_eq(task, &grandchild))
        );
        // Check if Child still has a parent
        assert!(child.borrow().parent.is_some());
        // Check if Child does not have Grandchild as subtask
        assert!(child.borrow().subtasks.is_empty());
    }

    #[test]
    fn test_move_to_preserves_subtasks() {
        let root = Task::new("Root");
        let child = Task::new("Child");
        let grandchild1 = Task::new("Grandchild1");
        let grandchild2 = Task::new("Grandchild2");
        let great_grandchild = Task::new("GreatGrandchild");

        Task::add_subtask(&root, &child);
        Task::add_subtask(&child, &grandchild1);
        Task::add_subtask(&child, &grandchild2);
        Task::add_subtask(&grandchild1, &great_grandchild);

        let result = Task::move_to(&grandchild1, &root);

        assert!(result.is_ok());
        // Check that grandchild1 is now under root
        assert!(
            root.borrow()
                .subtasks
                .iter()
                .any(|task| Rc::ptr_eq(task, &grandchild1))
        );
        // Check that great_grandchild is still under grandchild1
        assert_eq!(grandchild1.borrow().subtasks.len(), 1);
        assert!(
            grandchild1
                .borrow()
                .subtasks
                .iter()
                .any(|task| Rc::ptr_eq(task, &great_grandchild))
        );
        // Check that great_grandchild still has grandchild1 as parent
        assert_eq!(
            great_grandchild
                .borrow()
                .parent
                .as_ref()
                .and_then(|weak| weak.upgrade())
                .unwrap()
                .borrow()
                .title,
            "Grandchild1"
        );
    }

    #[test]
    fn test_complete() {
        let root = Task::new("Root");
        let child = Task::new("Child");
        let grandchild = Task::new("Grandchild");

        Task::add_subtask(&root, &child);
        Task::add_subtask(&child, &grandchild);
        root.borrow_mut().complete();

        // Check if Root is completed
        assert!(root.borrow().is_completed);
        // Check all Root's subtasks are completed
        assert!(
            root.borrow()
                .subtasks
                .iter()
                .all(|subtask| subtask.borrow().is_completed)
        );
    }

    #[test]
    fn test_delete_self() {
        let root = Task::new("Root");
        let child = Task::new("Child");
        let grandchild = Task::new("Grandchild");

        Task::add_subtask(&root, &child);
        Task::add_subtask(&child, &grandchild);

        let result = Task::delete_self(&child);

        assert!(result.is_ok());
        // Check if Grandchild is deleted
        assert!(grandchild.borrow().parent.is_none());
        // Check if Child does not have Grandchild as subtask
        assert!(child.borrow().subtasks.is_empty());
        // Check if Root does not have Child as subtask
        assert!(root.borrow().subtasks.is_empty());
    }

    #[test]
    fn test_get_path() {
        let root = Task::new("Root");
        let child = Task::new("Child");
        let grandchild = Task::new("Grandchild");

        Task::add_subtask(&root, &child);
        Task::add_subtask(&child, &grandchild);

        assert_eq!(
            grandchild.borrow().get_path(),
            vec!["Root", "Child", "Grandchild"]
        );
    }

    #[test]
    fn test_get_depth() {
        let root = Task::new("Root");
        let child = Task::new("Child");
        let grandchild = Task::new("Grandchild");

        Task::add_subtask(&root, &child);
        Task::add_subtask(&child, &grandchild);

        assert_eq!(grandchild.borrow().get_depth(), 2);
    }

    #[test]
    fn test_get_root() {
        let root = Task::new("Root");
        let child = Task::new("Child");
        let grandchild = Task::new("Grandchild");

        Task::add_subtask(&root, &child);
        Task::add_subtask(&child, &grandchild);

        assert!(grandchild.borrow().get_root().is_some());
        assert_eq!(
            grandchild.borrow().get_root().unwrap().borrow().title,
            "Root"
        );
    }

    #[test]
    fn test_reference_counts() {
        struct TodoApp {
            selected: Option<TaskRc>,
            bookmarked: Option<Vec<TaskRc>>,
        }

        let mut app = TodoApp {
            selected: None,
            bookmarked: None,
        };

        let root = Task::new("Root");
        let child = Task::new("Child");
        let grandchild = Task::new("Grandchild");

        Task::add_subtask(&root, &child);
        Task::add_subtask(&child, &grandchild);

        app.selected = Some(child.clone());
        app.bookmarked = Some(vec![child.clone(), grandchild.clone()]);

        // Before deletion - child has 4 strong references:
        // 1. `child` variable
        // 2. Inside `app.selected`
        // 3. Inside `app.bookmarked`
        // 4. Inside `root.subtasks`
        assert_eq!(Rc::strong_count(&child), 4);

        let result = Task::delete_self(&child);
        assert!(result.is_ok());

        // After deletion - child has 3 strong references:
        // 1. `child` variable
        // 2. Inside `app.selected`
        // 3. Inside `app.bookmarked`
        // It was removed from root.subtasks (reference dropped)
        assert_eq!(Rc::strong_count(&child), 3);

        // The child is "deleted" from the tree structure but still exists in memory.
        // This is an "orphaned" task - no longer part of the tree but still reachable

        if let Some(selected) = &app.selected {
            assert_eq!(selected.borrow().title, "Child");
        }
        if let Some(bookmarked) = &app.bookmarked {
            assert!(bookmarked.contains(&child));
            assert!(bookmarked.contains(&grandchild));
        }

        app.selected = None;
        app.bookmarked = None;
        // After dereferencing the task in the app, it has 1 strong reference:
        // 1. `child` variable
        assert_eq!(Rc::strong_count(&child), 1);

        drop(child);
        // After dropping the task, it has 0 strong references.
        // The task is now "deleted" from memory.
    }
}
