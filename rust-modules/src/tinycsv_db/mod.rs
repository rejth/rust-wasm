// Declare all submodules
mod csv;
mod database;
mod operations;
mod query;
mod row;
mod schema;
mod types;

// Re-export public API
pub use csv::to_csv;
pub use database::Database;
pub use operations::{delete, insert};
pub use query::{find_contains, find_exact};
pub use row::Row;
pub use schema::Schema;
pub use types::{DataType, Value};
