// Declare all submodules
mod database;
mod operations;
mod row;
mod schema;
mod types;

// Re-export public API
pub use database::Database;
pub use operations::{find_contains, find_exact, insert_to, remove_exact, to_csv};
pub use row::Row;
pub use schema::Schema;
pub use types::{DataType, Value};
