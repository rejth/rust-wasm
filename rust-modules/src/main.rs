use rust_modules::tinycsv_db::*;

fn main() {
    // Create a new schema for the database
    let schema = Schema::new(vec![
        ("id".to_string(), DataType::Integer),
        ("name".to_string(), DataType::Text),
        ("score".to_string(), DataType::Float),
        ("active".to_string(), DataType::Boolean),
    ]);

    // Create a new database with the schema
    let mut db = Database::new(schema);

    // Insert a new row into the database
    insert(
        &mut db,
        Row::new(vec![
            Value::Integer(1),
            Value::Text("Alice".to_string()),
            Value::Float(95.5),
            Value::Boolean(true),
        ]),
    );

    // Get the rows from the database
    let rows = db.get_rows();
    let row = &rows[0];
    assert_eq!(rows.len(), 1);
    assert_eq!(row.get_value(0), Some(&Value::Integer(1)));
    assert_eq!(row.get_value(1), Some(&Value::Text("Alice".to_string())));
    assert_eq!(row.get_value(2), Some(&Value::Float(95.5)));
    assert_eq!(row.get_value(3), Some(&Value::Boolean(true)));

    // Find rows with an exact match for the value "Alice" in the "name" column
    let ids = find_exact(&db, "name", &Value::Text("Alice".to_string()));
    assert_eq!(ids.len(), 1);

    // Find rows containing the text "lic" in the "name" column
    let contains = find_contains(&db, "name", "lic");
    assert_eq!(contains.len(), 1);

    // Convert the database to a CSV string
    let csv = to_csv(&db);
    assert_eq!(csv, "id,name,score,active\n1,Alice,95.5,true\n");

    // Restore the database from the CSV string
    let db2 = Database::from_csv(&csv);
    let rows = db2.get_rows();
    let row = &rows[0];
    assert_eq!(rows.len(), 1);
    assert_eq!(row.get_value(0), Some(&Value::Integer(1)));
    assert_eq!(row.get_value(1), Some(&Value::Text("Alice".to_string())));
    assert_eq!(row.get_value(2), Some(&Value::Float(95.5)));
    assert_eq!(row.get_value(3), Some(&Value::Boolean(true)));

    // Delete the row
    delete(&mut db, |row| row.get_value(0) == Some(&Value::Integer(1)));
    assert_eq!(db.get_rows().len(), 0);

    println!("All tests passed!");
}
