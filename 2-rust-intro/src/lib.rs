/// Adds two 32-bit signed integers.
///
/// # Arguments
/// - `a` — first addend
/// - `b` — second addend
///
/// # Returns
/// The sum of `a` and `b`.
///
/// # Examples
/// ```
/// use intro::add;
///
/// assert_eq!(add(2, 2), 4);
/// assert_eq!(add(-5, 3), -2);
/// ```
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}
