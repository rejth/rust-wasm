use iterable::SimpleLog;

fn main() {
    let mut log = SimpleLog::new();

    log.add("App started");
    log.add("User logged in");
    log.add("Connection timeout");

    // len() on collection (ExactSizeIterator implementation)
    assert_eq!(log.len(), 3);

    // Iterator are consumed (moved with ownership) by default.
    // But we can create a borrowed iterator with iter() method. into_iter() does opposite
    // This is helpful in this test case, because we want to iterate over the log multiple times and try different methods.
    // Alternatively, we can use into_iter() with by_ref() to create a borrowed iterator.
    let mut iter = log.iter();

    // next_back() - iteration from the end
    assert_eq!(iter.next_back(), Some(&"Connection timeout".to_string()));
    assert_eq!(iter.next_back(), Some(&"User logged in".to_string()));
    assert_eq!(iter.next(), Some(&"App started".to_string()));
    assert_eq!(iter.next(), None);

    // nth_back(n) - n-th element from the end (0-indexed)
    let mut iter = log.iter();
    assert_eq!(iter.nth_back(0), Some(&"Connection timeout".to_string())); // last element
    assert_eq!(iter.nth_back(0), Some(&"User logged in".to_string())); // now last element
    assert_eq!(iter.nth_back(1), None); // skip 1, but no elements left

    // rfind - search from the end
    let mut iter = log.iter();
    assert_eq!(
        iter.rfind(|s| s.contains("User")),
        Some(&"User logged in".to_string())
    );

    // rposition - element index from the end (but returns index from the start)
    let mut iter = log.iter();
    assert_eq!(iter.rposition(|s| s.contains("User")), Some(1)); // index 1 from the start

    // rfold (like JS reduceRight) - right fold
    let result = log
        .iter()
        .rfold(String::new(), |acc, s| match acc.is_empty() {
            true => s.clone(),
            false => format!("{} -> {}", acc, s),
        });
    assert_eq!(
        result,
        "Connection timeout -> User logged in -> App started"
    );

    // try_rfold (like JS reduceRight but with early exit on error) - right fold with early exit
    let result: Result<i32, &str> = log.iter().try_rfold(0, |acc, s| match s.contains("Error") {
        true => Err("Found error!"),
        false => Ok(acc + 1),
    });
    assert_eq!(result, Ok(3)); // no errors, counted 3 elements

    // FromIterator implementation
    let messages = vec![
        "Init".to_string(),
        "Running".to_string(),
        "Done".to_string(),
    ];

    // Create a log from an iterator
    let log = SimpleLog::from_iter(messages);
    assert_eq!(log.len(), 3);

    // rev() - reverse through DoubleEndedIterator (IntoIterator implementation)
    for msg in log.into_iter().rev() {
        println!("← {}", msg);
    }
}
