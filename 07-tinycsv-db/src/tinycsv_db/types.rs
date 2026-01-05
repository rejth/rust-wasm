#[derive(Debug, PartialEq)]
pub enum DataType {
    Integer,
    Text,
    Float,
    Boolean,
}

#[derive(Debug, PartialEq)]
pub enum Value {
    Integer(i64),
    Text(String),
    Float(f64),
    Boolean(bool),
}
