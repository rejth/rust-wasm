# Hierarchical Task System (Todo List)

Implement a simple hierarchical task structure, similar to a todo list with the ability to have nested subtasks (task tree).

## Task Structure

Each task should contain:

- **Title** (`title: String`)
- **Completion status** (`completed: bool`)
- **List of subtasks**
- **Reference to the parent task** (if the task is not root)

## Required Features

The following capabilities must be implemented:

- Creating a new task
- Adding a subtask to an existing task
- Marking a task as completed (with an option to recursively mark all subtasks)
- Pretty printing of the entire task tree with indentation, showing the hierarchy and completion status (e.g., with checkmarks for completed tasks)

## Example usage

```rust
fn main() {
    let root = Task::new("Learn Rust");

    let smart_ptrs = Task::new("Smart Pointers");
    let ownership = Task::new("Ownership and Borrowing");

    root.add_subtask(smart_ptrs.clone());
    root.add_subtask(ownership.clone());

    let box_rc = Task::new("Box, Rc, and Arc");
    smart_ptrs.add_subtask(box_rc);

    root.print_tree(0);

    smart_ptrs.mark_completed_recursive();

    println!("\nAfter completing the section:");
    root.print_tree(0);
}
```
