fn count_words(s: &str) -> usize {
    return s.split_whitespace().count()
}

fn append_tag(buffer: &mut String, tag: &str) {
    if !buffer.is_empty() {
        buffer.push(' ');
    }

    buffer.push_str(tag);
}

fn extract_domain(url: &str) -> &str {
    let start = url.find("://").map(|p| p + 3).unwrap_or(0);
    let domain_end = url[start..].find('/').map(|p| start + p).unwrap_or(url.len());

    return &url[start..domain_end]
}

fn redact_sensitive<'a, 'b>(text: &'a mut String, keyword: &'b str) -> &'a str {
    let mut last_end = 0;
    let mut result = String::new();

    while let Some(start) = text[last_end..].find(keyword) {
        let abs_start = last_end + start;
        result.push_str(&text[last_end..abs_start]);
        result.push_str("[REDACTED]");
        last_end = abs_start + keyword.len();
    }

    result.push_str(&text[last_end..]);

    *text = result;
    
    return &text[..10.min(text.len())]
}

fn build_summary<'a, 'b>(title: &'a str, body: &'b mut String, max_len: usize) -> (usize, &'a str) {
    let word_count = count_words(body);

    if body.len() > max_len {
        body.truncate(max_len);
        body.push_str("...");
    }

    append_tag(body, "[SUMMARY]");

    let preview = extract_domain(title);

    return (word_count, preview)
}

/**
 * Must return reference to EXISTING memory from inputs
 * Can ONLY return contiguous sequences
 * NO allocation
 * 
 * Current implementation:
 * Find contiguous range in `a`
 * Return slice pointing to that range
*/
fn find_intersection<'a>(a: &'a [i32], b: &'a [i32]) -> &'a [i32] {
    if a.is_empty() || b.is_empty() {
        return &[]
    }
    
    // Find the index of the first element which is in "b" slice
    let start = match a.iter().position(|n| b.binary_search(n).is_ok()) {
        Some(i) => i,
        None => return &[]
    };

    // Find the index of the last consecutive element which is in "b" slice
    let mut end = start + 1;
    for i in (start + 1)..a.len() {
        if b.binary_search(&a[i]).is_ok() {
            end = i + 1
        } else {
            break
        }
    };

    return &a[start..end]
}

fn _get_intersection<'a>(a: &'a [i32], b: &'a [i32]) -> &'a [i32] {
    if a.is_empty() || b.is_empty() {
        return &[]
    }

    let mut i = 0;
    let mut j = 0;
    let mut start = 0;

    while i < a.len() && j < b.len() {
        if a[i] == b[j] {
            if start == 0 {
                start = i + 1
            }
            i += 1;
            j += 1
        } else if a[i] < b[j] {
            if start > 0 {
                return &a[(start - 1)..i];
            }
            i += 1
        } else {
            j += 1
        }
    }

    if start == 0 {
        return &[]
    }

    return &a[(start - 1)..i]


}

fn main() {
    let url = "https://example.com/article";
    let mut content = String::from("  Secret password is 12345  ");

    {
        let temp = "hello world";
        assert_eq!(count_words(temp), 2);
    }

    let (words, domain) = build_summary(url, &mut content, 15);
    assert_eq!(words, 4);
    assert_eq!(domain, "example.com");
    assert!(content.ends_with("... [SUMMARY]"));

    let redacted_preview = redact_sensitive(&mut content, "  Secret");
    assert_eq!(redacted_preview, "[REDACTED]");

    let arr1 = [1, 2, 3, 4, 5];
    let arr2 = [3, 4, 5, 6, 7];
    assert_eq!(find_intersection(&arr1, &arr2), &[3, 4, 5]);

    let arr3 = [10, 20, 30];
    let arr4 = [25, 30, 35];
    assert_eq!(find_intersection(&arr3, &arr4), &[30]);

    let arr5 = [1, 1, 2, 2];
    let arr6 = [2, 2];
    assert_eq!(find_intersection(&arr5, &arr6), &[2, 2]);

    let arr7 = [1, 2, 60, 90];
    let arr8 = [2, 5, 90];
    assert_eq!(find_intersection(&arr7, &arr8), &[2]);

    let empty: &[i32] = &[];
    assert_eq!(find_intersection(empty, &arr1), &[]);

    {
        let v1 = vec![5, 10, 15, 20];
        let v2 = vec![15, 20, 25];
        assert_eq!(find_intersection(&v1, &v2), &[15, 20]);
    }

    println!("All tests have passed!");
}