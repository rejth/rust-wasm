#[derive(Debug, PartialEq, Clone)]
pub struct Task {
    pub title: String,
    pub is_completed: bool,
    pub subtasks: Vec<Task>,
    pub parent: Option<Box<Task>>,
}

impl Task {
    pub fn new(title: &str) -> Self {
        Self {
            title: title.to_string(),
            is_completed: false,
            subtasks: vec![],
            parent: None,
        }
    }

    pub fn add_subtask(&mut self, mut subtask: Task) {
        subtask.parent = Some(Box::new(self.clone()));
        self.subtasks.push(subtask);
    }

    /// Adds a subtask by taking ownership and returns a mutable reference to it.
    /// This allows to work with the added task directly without needing to clone.
    /// Note: The original variable is moved, so use the returned reference instead.
    pub fn add_subtask_mut(&mut self, subtask: Task) -> &mut Task {
        let len = self.subtasks.len();
        self.add_subtask(subtask);
        &mut self.subtasks[len] // Return mutable reference to the task we just added
    }

    pub fn move_to(&mut self, new_parent: &mut Task) -> Result<(), String> {
        let current_parent = self.parent.take();

        if let Some(mut parent) = current_parent {
            parent.subtasks.retain(|task| task != self);
        } else {
            return Err(format!("Task {} has no parent", self.title));
        }

        new_parent.add_subtask(self.clone());
        self.parent = Some(Box::new(new_parent.clone()));

        Ok(())
    }

    pub fn delete_self(&mut self) -> Result<(), String> {
        // Recursively delete all subtasks
        for subtask in self.subtasks.iter_mut() {
            subtask.parent = None;
            subtask.delete_self().unwrap();
        }

        // Clear subtasks list
        self.subtasks.clear();

        // Get parent and save it separately
        let current_parent = self.parent.take();

        // Delete yourself from parent subtasks
        if let Some(mut parent) = current_parent {
            parent.subtasks.retain(|task| task != self);
        }

        // Clear parent reference
        self.parent = None;

        Ok(())
    }

    pub fn complete(&mut self) {
        self.is_completed = true;

        for subtask in self.subtasks.iter_mut() {
            subtask.complete();
        }
    }

    pub fn get_path(&self) -> Vec<String> {
        let mut path = vec![self.title.clone()];
        let mut current_parent = self.parent.as_ref();

        while let Some(parent) = current_parent {
            path.push(parent.title.clone());
            current_parent = parent.parent.as_ref();
        }

        path.reverse();
        path
    }

    pub fn get_depth(&self) -> usize {
        let mut depth = 0;
        let mut current_parent = self.parent.as_ref();

        while let Some(parent) = current_parent {
            depth += 1;
            current_parent = parent.parent.as_ref();
        }

        depth
    }

    pub fn get_root(&self) -> Option<Self> {
        let mut current_parent = self.parent.as_ref();

        loop {
            let next = current_parent?.parent.as_ref();

            match next {
                Some(parent) => current_parent = Some(parent),
                None => return current_parent.map(|p| (**p).clone()),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new() {
        let task = Task::new("Root");
        assert_eq!(task.title, "Root");
    }

    #[test]
    fn test_add_subtask() {
        let mut root = Task::new("Root");
        let subtask = Task::new("Subtask");

        root.add_subtask(subtask);

        assert_eq!(root.subtasks.len(), 1);
        assert_eq!(root.subtasks[0].title, "Subtask");
    }

    #[test]
    fn test_move_to() {
        let mut root = Task::new("Root");
        let mut child = Task::new("Child");
        let grandchild = Task::new("Grandchild");

        root.add_subtask(child.clone());
        // Instead of cloning grandchild, we move it and get a reference
        let grandchild_ref = child.add_subtask_mut(grandchild);
        // Now we can use grandchild_ref instead of the original variable
        let result = grandchild_ref.move_to(&mut root);

        assert!(result.is_ok());
        // Check if Grandchild is now a child of Root
        assert!(root.subtasks.iter().any(|task| task.title == "Grandchild"));
        // Check if Grandchild has Root as parent (check the one in root.subtasks)
        let moved_grandchild = root
            .subtasks
            .iter()
            .find(|task| task.title == "Grandchild")
            .unwrap();
        assert_eq!(moved_grandchild.parent.as_deref().unwrap().title, "Root");
        // Check if Child still has a parent (check the one in root.subtasks)
        let child_in_root = root
            .subtasks
            .iter()
            .find(|task| task.title == "Child")
            .unwrap();
        assert!(child_in_root.parent.is_some());
        // Check if Child does not have Grandchild as subtask (it was moved)
        assert!(child_in_root.subtasks.is_empty());
    }

    #[test]
    fn test_move_to_preserves_subtasks() {
        let mut root = Task::new("Root");
        let mut child = Task::new("Child");
        let grandchild1 = Task::new("Grandchild1");
        let great_grandchild = Task::new("GreatGrandchild");

        root.add_subtask(child.clone());
        let grandchild1_ref = child.add_subtask_mut(grandchild1);
        grandchild1_ref.add_subtask_mut(great_grandchild);

        // Move grandchild1 from child to root
        let result = grandchild1_ref.move_to(&mut root);

        assert!(result.is_ok());
        // Check that grandchild1 is now under root
        assert!(root.subtasks.iter().any(|task| task.title == "Grandchild1"));
        // Check that great_grandchild is still under grandchild1 (in root.subtasks)
        let moved_grandchild1 = root
            .subtasks
            .iter()
            .find(|task| task.title == "Grandchild1")
            .unwrap();
        assert_eq!(moved_grandchild1.subtasks.len(), 1);
        assert!(
            moved_grandchild1
                .subtasks
                .iter()
                .any(|task| task.title == "GreatGrandchild")
        );
        // Check that great_grandchild still has grandchild1 as parent
        let moved_great_grandchild = moved_grandchild1
            .subtasks
            .iter()
            .find(|task| task.title == "GreatGrandchild")
            .unwrap();
        assert_eq!(
            moved_great_grandchild.parent.as_deref().unwrap().title,
            "Grandchild1"
        );
    }

    #[test]
    fn test_complete() {
        let mut root = Task::new("Root");
        let mut child = Task::new("Child");
        let grandchild = Task::new("Grandchild");

        root.add_subtask(child.clone());
        child.add_subtask(grandchild.clone());
        root.complete();

        // Check if Root is completed
        assert!(root.is_completed);
        // Check all Root's subtasks are completed
        assert!(root.subtasks.iter().all(|subtask| subtask.is_completed));
    }

    #[test]
    fn test_delete_self() {
        let mut root = Task::new("Root");
        let child = Task::new("Child");
        let grandchild = Task::new("Grandchild");

        let child_ref = root.add_subtask_mut(child);
        // Use a block scope to limit the lifetime of grandchild_ref
        let _grandchild_ref = child_ref.add_subtask_mut(grandchild);
        // Delete Child from the tree structure
        let result = child_ref.delete_self();

        assert!(result.is_ok());
        // Check if Child subtasks list is empty
        assert!(child_ref.subtasks.is_empty());
        // Check if Child parent is None
        assert!(child_ref.parent.is_none());
        // Check if Root subtasks list is empty
        // !Important: This does not work because the child is cloned when added to root.subtasks so it is not the same child as the one we deleted.
        assert!(root.subtasks.is_empty());
    }

    #[test]
    fn test_get_path() {
        let mut root = Task::new("Root");
        let child = Task::new("Child");
        let grandchild = Task::new("Grandchild");

        let child_ref = root.add_subtask_mut(child);
        let grandchild_ref = child_ref.add_subtask_mut(grandchild);

        assert_eq!(
            grandchild_ref.get_path(),
            vec!["Root", "Child", "Grandchild"]
        );
    }

    #[test]
    fn test_get_depth() {
        let mut root = Task::new("Root");
        let child = Task::new("Child");
        let grandchild = Task::new("Grandchild");

        let child_ref = root.add_subtask_mut(child);
        let grandchild_ref = child_ref.add_subtask_mut(grandchild);

        assert_eq!(grandchild_ref.get_depth(), 2);
    }

    #[test]
    fn test_get_root() {
        let mut root = Task::new("Root");
        let child = Task::new("Child");
        let grandchild = Task::new("Grandchild");

        let child_ref = root.add_subtask_mut(child);
        let grandchild_ref = child_ref.add_subtask_mut(grandchild);

        assert!(grandchild_ref.get_root().is_some());
        assert_eq!(grandchild_ref.get_root().unwrap().title, "Root");
    }
}
