use serializer::serializer::{Person, to_debug, to_json};

fn main() {
    let person = Person {
        name: "John".to_string(),
        age: 30,
        active: true,
    };

    let json = to_json(&person).unwrap();
    println!("JSON: {}", json);

    let debug = to_debug(&person).unwrap();
    println!("Debug: {}", debug);

    println!("i32: {}", to_json(&42i32).unwrap());
    println!("bool: {}", to_json(&true).unwrap());
    println!("String: {}", to_json(&"Hello, World!".to_string()).unwrap());
    println!("Array: {}", to_json(&[1i32, 2, 3]).unwrap());
    println!("Vec: {}", to_json(&vec![10u32, 20, 30]).unwrap());
    println!("Tuple: {}", to_json(&(42i32, "test".to_string())).unwrap());

    {
        let person = Person {
            name: "Alex".to_string(),
            age: 25,
            active: true,
        };

        let json = to_json(&person).unwrap();

        let debug = to_debug(&person).unwrap();

        assert_eq!(json, r#"{"name":"Alex","age":25,"active":true}"#);
        println!("✓ JSON test passed");

        assert_eq!(debug, "Person { name: \"Alex\", age: 25, active: true }");
        println!("✓ Debug test passed");
    }

    {
        // Test with escaping
        let person = Person {
            name: r#"Alex"#.to_string(),
            age: 30,
            active: false,
        };

        let json = to_json(&person).unwrap();
        assert_eq!(json, r#"{"name":"Alex","age":30,"active":false}"#);
        println!("✓ Escaping test passed");
    }

    {
        // Test with control symbols (e.g. \n)
        let person = Person {
            name: "Hello\nworld".to_string(),
            age: 42,
            active: true,
        };

        let json = to_json(&person).unwrap();
        assert_eq!(json, r#"{"name":"Hello\nworld","age":42,"active":true}"#);
        println!("✓ Test with \\n passed");
    }

    println!("\nAll tests passed!");
}
