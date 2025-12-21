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
}
