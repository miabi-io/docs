package main

import (
	"fmt"
	"strings"

	"github.com/miabi-io/miabi/internal/dnscatalog"
)

func main() {
	fmt.Println("| Type | Host | Credential fields | Where to create them |")
	fmt.Println("|---|---|---|---|")
	for _, d := range dnscatalog.All() {
		var fields []string
		for _, f := range d.Fields {
			s := "`" + f.Key + "`"
			if !f.Required {
				s += " *"
			}
			fields = append(fields, s)
		}
		note := ""
		if d.ChallengeOnly {
			note = " **(DNS-01 only)**"
		}
		docs := "—"
		if d.DocsURL != "" {
			docs = "[Console](" + d.DocsURL + ")"
		}
		fmt.Printf("| `%s` | %s%s | %s | %s |\n", d.Type, d.Label, note, strings.Join(fields, ", "), docs)
	}
}
