fn find_with_result<T: PartialEq>(arr: &[T], value: T) -> Result<&T, &'static str> {
    if arr.is_empty() {
        return Result::Err("Array is empty");
    }
    for el in arr {
        if *el == value {
            return Result::Ok(el);
        }
    }
    Result::Err("Not found")
}

fn find_with_option<T: PartialEq>(arr: &[T], value: T) -> Option<&T> {
    if arr.is_empty() {
        return None;
    }
    for el in arr {
        if *el == value {
            return Some(el);
        }
    }
    None
}

fn main() {
    // Pattern matching 1
    match find_with_option(&[1, 2, 3, 4, 5], 3) {
        Some(value) => println!("value: {value}"),
        None => println!("not found"),
    }
    // Pattern matching 2
    if let Some(value) = find_with_option(&[1, 2, 3, 4, 5], 3) {
        println!("value: {value}");
    }
    // Pattern matching 3
    if let Err(err) = find_with_result(&[1, 2, 3, 4, 5], 10) {
        println!("error: {err}");
    }

    // Functor API
    let result = find_with_option(&[1, 2, 3, 4, 5], 1).map_or_else(
        || {
            println!("Functor API: not found");
            0 // default value when None
        },
        |value| {
            println!("Functor API: value: {value}");
            *value * 2
        },
    );
    println!("Functor API: final result: {result}");

    // Monadic API
    // and_then chains operations: if Ok, apply function; if Err, pass through unchanged
    // The chain continues in the monadic context - operations compose seamlessly
    let result = find_with_result(&[1, 2, 3, 4, 5], 3)
        .and_then(|value| {
            println!("Monad API: found value: {value}");
            Ok(value)
        })
        .map(|value| {
            println!("Monad API: using value: {value}");
            *value * 2
        })
        .unwrap_or_else(|err| {
            println!("Monad API: error: {err}");
            0 // default value on error
        });
    println!("Monad API: final result {result}");

    // or_else chains error handling: if Err, apply function; if Ok, pass through unchanged
    // Chain multiple error transformations or recovery attempts
    let result = find_with_result(&[1, 2, 3, 4, 5], 10)
        .or_else(|err| {
            println!("Monad API: handling error: {err}");
            Err(err)
        })
        .map(|value| {
            println!("Monad API: using value: {value}");
            *value * 2
        })
        .unwrap_or_else(|err| {
            println!("Monad API: error: {err}");
            0 // default value on error
        });
    println!("Monad API: final result {result}");
}
