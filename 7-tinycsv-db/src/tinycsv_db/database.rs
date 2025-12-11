use super::row::Row;
use super::schema::Schema;
use super::types::{DataType, Value};

pub struct Database {
    pub(crate) schema: Schema,
    pub(super) rows: Vec<Row>,
}

impl Database {
    pub fn new(schema: Schema) -> Self {
        Database {
            schema,
            rows: Vec::new(),
        }
    }

    pub fn get_schema(&self) -> &Schema {
        &self.schema
    }

    pub fn get_rows(&self) -> &Vec<Row> {
        &self.rows
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
    pub fn from_csv(input: &str) -> Database {
        let mut columns: Vec<(String, DataType)> = Vec::new();
        let mut rows: Vec<Row> = Vec::new();

        let headers = input.lines().next().unwrap();

        for header in headers.split(',') {
            match header {
                "id" => columns.push(("id".to_string(), DataType::Integer)),
                "name" => columns.push(("name".to_string(), DataType::Text)),
                "score" => columns.push(("score".to_string(), DataType::Float)),
                "active" => columns.push(("active".to_string(), DataType::Boolean)),
                _ => panic!("Unknown field, {}", header),
            }
        }

        for row in input.lines().skip(1) {
            rows.push(Row {
                values: row
                    .split(',')
                    .map(|value| detect_value_type(value.trim()))
                    .collect(),
            });
        }

        Database {
            schema: Schema { columns },
            rows,
        }
    }
}

fn detect_value_type(value: &str) -> Value {
    if let Ok(b) = value.parse::<bool>() {
        return Value::Boolean(b);
    }
    if let Ok(i) = value.parse::<i64>() {
        return Value::Integer(i);
    }
    if let Ok(f) = value.parse::<f64>() {
        return Value::Float(f);
    }
    Value::Text(value.to_string())
}
