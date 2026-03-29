package main

import (
	"embed"
	"fmt"
	"io/fs"
	"net/http"
)

//go:embed static/*
var content embed.FS

func main() {
	staticFS, _ := fs.Sub(content, "static")
	http.Handle("/", http.FileServer(http.FS(staticFS)))
	fmt.Println("Server running on :8080")
	http.ListenAndServe(":8080", nil)
}
