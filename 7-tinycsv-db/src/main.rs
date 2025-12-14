use tinycsv_db::tinycsv_db::*;

fn main() {
    let schema = Schema::new(vec![
        ("id".to_string(), DataType::Integer),
        ("name".to_string(), DataType::Text),
        ("score".to_string(), DataType::Float),
        ("active".to_string(), DataType::Boolean),
    ]);

    let mut db = Database::new(schema);

    // Insert
    insert_to(
        &mut db,
        Row::new(vec![
            Value::Integer(1),
            Value::Text("Alice".to_string()),
            Value::Float(95.5),
            Value::Boolean(true),
        ]),
    );
    insert_to(
        &mut db,
        Row::new(vec![
            Value::Integer(2),
            Value::Text("Bob".to_string()),
            Value::Float(60.0),
            Value::Boolean(true),
        ]),
    );

    // Search
    let ids = find_exact(&db, "name", &Value::Text("Alice".to_string()));
    assert_eq!(*ids, [0]);

    let contains = find_contains(&db, "name", "lic");
    assert_eq!(*contains, [0]);

    // Serialization / deserialization
    let csv = to_csv(&db);
    assert_eq!(
        csv,
        "\
id:Integer,name:Text,score:Float,active:Boolean
1,Alice,95.5,true
2,Bob,60,true
"
    );

    let db2 = Database::from_csv(&csv);
    assert_eq!(db2, db);

    remove_exact(&mut db, "name", &Value::Text("Bob".to_string()));
    assert_eq!(
        to_csv(&db),
        "\
id:Integer,name:Text,score:Float,active:Boolean
1,Alice,95.5,true
"
    );

    println!("All tests passed!");
}
