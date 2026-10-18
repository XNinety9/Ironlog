// Sonde de santé pour l'image web : l'image nginx minimale n'a ni shell ni wget.
// Binaire statique (~2 Mo) : sort en 0 si l'URL répond sans erreur, en 1 sinon.
package main

import (
	"net/http"
	"os"
	"time"
)

func main() {
	url := "http://127.0.0.1:8080/"
	if len(os.Args) > 1 {
		url = os.Args[1]
	}
	client := http.Client{Timeout: 3 * time.Second}
	res, err := client.Get(url)
	if err != nil || res.StatusCode >= 400 {
		os.Exit(1)
	}
}
