use super::schema::Schema;
use super::types::{DataType, Value};

#[derive(Debug, PartialEq)]
pub struct Row {
    pub(crate) values: Vec<Value>,
}

impl Row {
    pub fn new(values: Vec<Value>) -> Self {
        Self { values }
    }

    pub fn get_values(&self) -> &[Value] {
        &self.values
    }

    /// Parse row from CSV string.
    ///
    /// # Arguments
    /// * `row` - CSV string to parse row from
    /// * `schema` - Schema to parse row from
    ///
    /// # Returns
    /// A new row parsed from the CSV string.
    ///
    /// # Panics
    /// Panics if the CSV string is invalid.
    pub(crate) fn parse_row(row: &str, schema: &Schema) -> Self {
        let mut values = vec![];

        for (i, column) in row.split(",").enumerate() {
            assert!(i < schema.columns.len());

            match schema.columns[i].1 {
                DataType::Integer => {
                    values.push(Value::Integer(column.parse::<i64>().unwrap()));
                }
                DataType::Float => {
                    values.push(Value::Float(column.parse::<f64>().unwrap()));
                }
                DataType::Text => {
                    values.push(Value::Text(column.to_string()));
                }
                DataType::Boolean => {
                    values.push(Value::Boolean(column == "true"));
                }
            }
        }

        Self { values }
    }
}
