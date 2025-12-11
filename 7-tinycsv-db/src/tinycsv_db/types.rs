pub enum DataType {
    Integer,
    Text,
    Float,
    Boolean,
}

#[derive(PartialEq, Debug)]
pub enum Value {
    Integer(i64),
    Text(String),
    Float(f64),
    Boolean(bool),
}
