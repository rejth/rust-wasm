

fn main() {
    assert_eq!(calculate(10, 20, "+"), 30);
    assert_eq!(calculate(100, 200, "+"), 300);
    assert_eq!(calculate(i32::MAX, 1, "+"), i32::MAX);
    
    assert_eq!(calculate(50, 30, "-"), 20);
    assert_eq!(calculate(i32::MIN, 1, "-"), i32::MIN);
    
    assert_eq!(calculate(5, 6, "*"), 30);
    assert_eq!(calculate(i32::MAX, 2, "*"), i32::MAX);
    
    assert_eq!(calculate(10, 20, "/"), 0);
    
    println!("All tests passed!");

    let msg1 = format_message("Alex", 150, 5);
    assert_eq!(msg1, "Hello, Alex! Your account: 150, level: 5.");

    let name_string = String::from("Maria");
    let msg2 = format_message(name_string.as_str(), 999, 12);
    assert_eq!(msg2, "Hello, Maria! Your account: 999, level: 12.");

    let greet1 = build_greeting("Ivan", "Welcome!");
    assert_eq!(greet1, "Ivan Welcome!");

    println!("All tests passed!");
}

fn calculate(a: i32, b: i32, operation: &str) -> i32 {
    match operation {
        "+" => i32::saturating_add(a, b),
        "-" => i32::saturating_sub(a, b),
        "*" => i32::saturating_mul(a, b),
        _ => 0
    }
}

fn format_message(name: &str, score: u32, level: u32) -> String {
    return format!("Hello, {name}! Your account: {score}, level: {level}.")
}

fn build_greeting(name: &str, suffix: &str) -> String {
    return String::from(name) + " " + suffix
}
