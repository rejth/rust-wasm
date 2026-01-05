use smart_pointers::rc_variant::Task;
use std::{cell::RefCell, rc::Rc};

struct TodoApp {
    root: Option<Rc<RefCell<Task>>>,
    selected: Option<Rc<RefCell<Task>>>,
}

fn main() {
    let mut app = TodoApp {
        root: None,
        selected: None,
    };

    let root = Task::new("Root");
    let child = Task::new("Child");
    let grandchild = Task::new("Grandchild");

    Task::add_subtask(&root, &child);
    Task::add_subtask(&child, &grandchild);

    app.root = Some(root.clone());
    app.selected = Some(child.clone());

    let path = grandchild.borrow().get_path();
    println!("Path: {:?}", path); // ["Root", "Child", "Grandchild"]

    let depth = grandchild.borrow().get_depth();
    println!("Depth: {}", depth); // 2

    let root_task = grandchild.borrow().get_root().unwrap();
    println!("Root: {}", root_task.borrow().title); // "Root"

    // Move grandchild to root
    let result = Task::move_to(&grandchild, &root_task);
    assert!(result.is_ok());

    // Check grandchild parent is root
    assert!(grandchild.borrow().parent.is_some());
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
    // Check if child does not have grandchild as subtask
    assert!(child.borrow().subtasks.is_empty());

    // Mark root task complete
    root.borrow_mut().complete();
    println!("Root task completed: {}", root_task.borrow().is_completed); // true
                                                                          // Check all subtasks are completed
    assert!(root_task
        .borrow()
        .subtasks
        .iter()
        .all(|subtask| subtask.borrow().is_completed));

    // Before deletion - child has 3 strong references:
    // 1. `child` variable
    // 2. `app.selected`
    // 3. Inside `root.subtasks`
    println!("\nBefore deletion:");
    println!("child strong_count: {}", Rc::strong_count(&child));
    println!("child parent exists: {}", child.borrow().parent.is_some());

    let result = Task::delete_self(&child);
    println!("\nResult: {:?}", result);

    // After deletion - child has 2 strong references:
    // 1. `child` variable
    // 2. `app.selected`
    // It was removed from root.subtasks (reference dropped)
    println!("\nAfter deletion:");
    println!("child strong_count: {}", Rc::strong_count(&child));
    println!("child parent exists: {}", child.borrow().parent.is_some());
    println!("child is still accessible: '{}'", child.borrow().title);

    println!("\nAfter deletion:");
    println!("grandchild strong_count: {}", Rc::strong_count(&grandchild));
    println!(
        "grandchild parent exists: {}",
        grandchild.borrow().parent.is_some()
    );
    println!(
        "grandchild is still accessible: '{}'",
        grandchild.borrow().title
    );

    // The child is "deleted" from the tree structure but still exists in memory!
    // This is an "orphaned" task - no longer part of the tree but still reachable

    if let Some(selected) = &app.selected {
        println!(
            "app.selected still points to: '{}'",
            selected.borrow().title
        );
    }
}
