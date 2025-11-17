struct Author<'a> {
    name: &'a str, // The data must live at least as long as the struct (or longer), not less
}

struct Book<'a> {
    title: &'a str,
    year: u16,
    author: Author<'a>, // The data must live at least as long as the struct (or longer), not less
    tags: Vec<&'a str>,
    copies: Vec<(u32, bool)>
}

struct Library<'a> {
    books: Vec<Book<'a>>, // The data must live at least as long as the struct (or longer), not less
}

/// Returns the number of available copies of the book.
/// 
/// # Arguments
/// * `book` - The book to search in
/// 
/// # Returns
/// The number of available copies of the book.
fn count_available_copies(book: &Book) -> usize {
    book.copies.iter().filter(|(_, is_available)| *is_available).count()
}

/// Finds and returns all books by the specified author.
///
/// # Arguments
/// * `library` - The library to search in
/// * `name` - The author's name to match
///
/// # Returns
/// A boxed slice of references to books by the specified author.
/// Returns an empty slice if no books are found.
///
/// # Lifetimes
/// The returned book references are borrowed from the library and share its lifetime.
/// Book must live at least as long as Library.
fn find_books_by_author<'a>(library: &'a Library<'a>, name: &str) -> Box<[&'a Book<'a>]> {
    library.books.iter().filter(|book| book.author.name == name).collect()
}

/// Returns the oldest book in the library (book with the smallest year).
/// 
///  # Arguments
/// * `library` - The library to search in
///
/// # Returns
/// * Option because the data might be empty
/// * `Some(&Book)` - Reference to the oldest book if the library is not empty
/// * `None` - If the library contains no books
///
/// # Lifetimes
/// The returned book reference is borrowed from the library and shares its lifetime.
/// Book must live at least as long as Library.
fn oldest_book<'a>(library: &'a Library<'a>) -> Option<&'a Book<'a>> {
    library.books.iter().min_by_key(|book| book.year)
}

/// Adds a new tag to the book if it doesn't already exist.
///
/// # Arguments
/// * `book` - The book to modify
/// * `tag` - The tag to add
///
/// # Lifetimes
/// The tag must live at least as long as the book's data since it will be stored in the book.
fn add_tag<'a>(book: &mut Book<'a>, tag: &'a str) {
    if !book.tags.contains(&tag) {
        book.tags.push(tag);
    }
}

fn main() {
    let mut book1 = Book {
        title: "Солярис",
        year: 1961,
        author: Author { name: "Лем" },
        tags: vec!["sci-fi"],
        copies: vec![(1, true), (2, false), (3, true)],
    };

    add_tag(&mut book1, "classic");
    add_tag(&mut book1, "sci-fi");

    let book2 = Book {
        title: "Пикник на обочине",
        year: 1972,
        author: Author { name: "Стругацкие" },
        tags: vec!["sci-fi", "classic"],
        copies: vec![(10, false), (11, false)],
    };

    let library = Library {
        books: vec![book1, book2],
    };

    let books_lem = find_books_by_author(&library, "Лем");
    assert_eq!(books_lem.len(), 1);
    assert_eq!(books_lem[0].title, "Солярис");

    let books_str = find_books_by_author(&library, "Стругацкие");
    assert_eq!(books_str.len(), 1);
    assert_eq!(books_str[0].title, "Пикник на обочине");

    let oldest = oldest_book(&library).unwrap();
    assert_eq!(oldest.title, "Солярис");

    let first_book = &library.books[0];
    assert_eq!(count_available_copies(first_book), 2);

    println!("All tests have passed!");
}