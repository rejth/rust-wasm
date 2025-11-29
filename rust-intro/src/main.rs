fn main() {
    fizz_buss();
    print_test();

    let year = 2024;
    let month = 1;
    let day = 15;

    let amount = 142.9765;

    let r = 255;
    let g = 128;
    let b = 0;

    let name = "Alice";
    let age = 25;
    let score = 95.543;

    println!("2024-01-15 -> {}-{:02}-{:02}", year, month, day);
    println!("142.98 ₽ -> {:.2} ₽", amount);
    println!("#FF8000 -> #{:02X}{:02X}{:02X}", r, g, b);
    println!("| {:<8} | {:^8} | {:>8} |", name, age, score);
}

fn fizz_buss() {
    let n = 42;

    if n % 3 == 0 {
        println!("Fizz")
    } else if n % 5 == 0 {
        println!("Buzz")
    } else if n % 3 & n % 5 == 0 {
        println!("FizzBuzz")
    } else {
        println!("{}", n)
    }
}

fn print_test() {
    let name = "Alice";
    let age = 25;
    let height = 1.75;
    let numbers = [1, 2, 3, 4, 5];

    // 1. Basic formatting
    println!("1. Hello, {}! You are {} years old.", name, age);

    // 2. Positional arguments
    println!(
        "2. {1} years old, name is {0}, height {2}m",
        name, age, height
    );

    // 3. Named arguments
    println!("3. Name: {name}, age: {age}, height: {height:.2}m");

    // 4. Number formatting
    println!("4. Number π: {:.3}", std::f64::consts::PI);
    println!("5. Binary: {:b}, Hexadecimal: {:x}", 255, 255);

    // 5. Alignment and padding
    println!("6. |{:<10}|{:^10}|{:>10}|", "left", "center", "right");

    // 6. Debug and pretty printing
    println!("7. Debug: {:?}", numbers);
    println!("8. Pretty: {:#?}", numbers);

    // 7. Padding
    println!("9. Zero padding: {:05}", 42);

    // 8. Scientific notation
    println!("10. Scientific: {:e}", 1234567.89);
}
