(module
  ;; Import the `log` JS function (accepts pointer and string length)
  (import "env" "log" (func $log(param i32 i32)))

  ;; Define the memory for string (1 page = 64 КB)
  (memory (export "memory") 1)

  ;; Record "Hello, world!" to the memory
  (data (i32.const 0) "Hello, world!")

  ;; Export `hello` so we can call it from JS
  (func (export "hello")
    ;; Pass the pointer (0) and string length (13 symbols)
    (call $log(i32.const 0) (i32.const 13))
  )
)