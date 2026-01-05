use super::row::Row;
use super::schema::Schema;

#[derive(Debug, PartialEq)]
pub struct Database {
    pub(crate) schema: Schema,
    pub(crate) data: Vec<Row>,
}

impl Database {
    pub fn new(schema: Schema) -> Self {
        Self {
            schema,
            data: vec![],
        }
    }

    pub fn get_data(&self) -> &[Row] {
        &self.data
    }

    /// Restore database from CSV string.
    ///
    /// # Arguments
    /// * `input` - CSV string to restore database from
    ///
    /// # Returns
    /// A new database restored from the CSV string.
    ///
    /// # Panics
    /// Panics if the CSV string is invalid.
    pub fn from_csv(csv: &str) -> Self {
        let schema = Schema::parse_schema(csv.lines().next().unwrap());
        let data = csv
            .lines()
            .skip(1)
            .map(|row| Row::parse_row(row, &schema))
            .collect();

        Self { schema, data }
    }
}
