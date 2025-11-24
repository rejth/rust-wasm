use super::database::Database;
use super::row::Row;

/// Insert a new row into the database.
///
/// # Arguments
/// * `db` - The database to insert the row into
/// * `row` - The row to insert
pub fn insert(db: &mut Database, row: Row) {
    db.rows.push(row);
}

/// Delete rows from the database based on a predicate.
///
/// # Arguments
/// * `db` - The database to delete rows from
/// * `predicate` - A predicate function to filter rows to delete
pub fn delete(db: &mut Database, predicate: fn(&Row) -> bool) {
    db.rows.retain(|row| !predicate(row));
}
