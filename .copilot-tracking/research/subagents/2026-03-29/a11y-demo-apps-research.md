# A11y Demo Apps Research

## Research Topics

1. Repository structure, app type, and tech stack for each of the 5 sibling demo apps
2. Accessibility violations and patterns each app demonstrates
3. Dependency/build configuration files (package.json equivalents)
4. Infrastructure files (Dockerfile, Bicep)
5. README content and purpose
6. How each app differs from the others

## Repositories Investigated

- devopsabcs-engineering/a11y-demo-app-001
- devopsabcs-engineering/a11y-demo-app-002
- devopsabcs-engineering/a11y-demo-app-003
- devopsabcs-engineering/a11y-demo-app-004
- devopsabcs-engineering/a11y-demo-app-005

---

## App 001 — Rust (Actix-web) — Travel Booking Site

### Tech Stack

- **Language:** Rust
- **Framework:** Actix-web 4
- **Build tool:** Cargo (Cargo.toml)
- **No package.json** — uses Cargo.toml for dependencies

### Repository Structure

```text
Cargo.toml
Dockerfile
README.md
start-local.ps1
stop-local.ps1
infra/
  main.bicep
src/
  main.rs
static/
  index.html
```

### App Server Code

`src/main.rs` — Actix-web serving static files from `./static`:

```rust
use actix_files as fs;
use actix_web::{App, HttpServer};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new().service(fs::Files::new("/", "./static").index_file("index.html"))
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await
}
```

### Theme / Domain

**TravelNow Bookings** — Travel booking site with destinations (Paris, Tokyo, Bali), flight deals table, and flight search form.

### Dockerfile

Multi-stage Rust build:

```dockerfile
FROM rust:1.88-slim AS build
...
FROM debian:bookworm-slim
EXPOSE 8080
CMD ["./a11y-demo-app-001"]
```

### Local Port

8001

### Infrastructure

Identical Bicep template as all other sibling apps: ACR + App Service Plan (B1 Linux) + Web App for Containers.

### Key Accessibility Violations

- `<html>` missing `lang` attribute
- No page `<title>` in HTML (set via JS to generic "Page")
- Popup modal on load with no focus trap, no ARIA role, no label
- Keyboard trap: `document.addEventListener('keydown', function(e) { if (e.key === 'Tab') { } });`
- `.btn:focus { outline: none; }` — focus indicator removed
- Buttons are `<div class="btn" onclick="...">` instead of `<button>`
- Images missing `alt` attributes
- Extremely poor color contrast throughout (e.g., `color: #555` on `background: #1a1a1a`, `color: #bbb` on `background: #aaa`)
- Heading hierarchy violations (h4 before h1, h6 for card titles)
- `<marquee>` and blinking text (WCAG 2.3.1)
- Deprecated `<font>` tags
- Forms with no `<label>` elements, no fieldset, placeholder-only
- Tables with no `<th>`, no `<caption>`, no scope
- Links saying "click here" with no descriptive text
- Breadcrumb as plain text div (no `<nav>` landmark)
- `font-size: 9px` and `11px` text throughout
- No skip-to-content link
- No landmark regions

---

## App 002 — C# ASP.NET — E-Commerce Store

### Tech Stack

- **Language:** C#
- **Framework:** ASP.NET 8.0 (minimal API)
- **Build tool:** dotnet (.csproj)
- **No package.json** — uses `webapp/webapp.csproj`

### Repository Structure

```text
Dockerfile
README.md
start-local.ps1
stop-local.ps1
infra/
  main.bicep
webapp/
  Program.cs
  webapp.csproj
  wwwroot/
    index.html
```

### App Server Code

`webapp/Program.cs` — Minimal API serving static index.html:

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
app.UseStaticFiles();
app.MapGet("/", () => {
    var filePath = Path.Combine(app.Environment.WebRootPath, "index.html");
    return Results.File(filePath, "text/html");
});
app.Run();
```

### Theme / Domain

**Demo Store** — E-commerce site with products (Wireless Headphones, Smart Watch, Bluetooth Speaker), price comparison table, and contact form.

### Dockerfile

Multi-stage .NET build:

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
...
FROM mcr.microsoft.com/dotnet/aspnet:8.0
EXPOSE 8080
ENTRYPOINT ["dotnet", "webapp.dll"]
```

### Local Port

8002

### Key Accessibility Violations

All violations from App 001 plus:

- **Inaccessible tab interface** — `<span class="btn" onclick="...">` for tab switching with no ARIA roles (`tablist`, `tab`, `tabpanel`)
- **Inaccessible image map** — `<img usemap="#storemap">` with `<area>` elements lacking alt text
- **Autoplaying content** mentioned in HTML comments
- Tab panel with `.tab-panel div` CSS

### Unique to App 002

Has an inaccessible tab interface for "Product Details" (Description/Specs/Reviews), inaccessible image map for "Store Locations," and explicit comments documenting each violation category.

---

## App 003 — Java Spring Boot — Online Learning Platform

### Tech Stack

- **Language:** Java 17
- **Framework:** Spring Boot 3.2 with Thymeleaf templates
- **Build tool:** Gradle (build.gradle, settings.gradle)
- **No package.json** — uses `build.gradle`

### Repository Structure

```text
build.gradle
settings.gradle
Dockerfile
README.md
start-local.ps1
stop-local.ps1
gradle/
infra/
  main.bicep
src/
  main/
    java/
      com/example/demo/
        Application.java
        HomeController.java
    resources/
      templates/
        index.html
```

### App Server Code

`Application.java` — Standard Spring Boot entry point.
`HomeController.java` — `@GetMapping("/")` returns `"index"` (Thymeleaf template).

The HTML uses `<html xmlns:th="http://www.thymeleaf.org">` confirming Thymeleaf integration.

### Theme / Domain

**Online Learning Platform** — Education site with courses (Web Development, Data Science, Cloud Computing), course schedule table, and information request form.

### Dockerfile

Multi-stage Java build using Eclipse Temurin:

```dockerfile
FROM eclipse-temurin:17-jdk AS build
...gradle bootJar...
FROM eclipse-temurin:17-jre
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Local Port

8003

### Key Accessibility Violations

Same core violation pattern as all apps. No additional unique violation types — same template structure (popup, keyboard trap, poor contrast, missing landmarks, etc.) with education-themed content.

---

## App 004 — Python Flask — Recipe Site

### Tech Stack

- **Language:** Python 3.12
- **Framework:** Flask 3.0
- **Production server:** Gunicorn
- **Build tool:** pip (requirements.txt)
- **No package.json** — uses `requirements.txt`

### Repository Structure

```text
app.py
requirements.txt
Dockerfile
README.md
start-local.ps1
stop-local.ps1
infra/
  main.bicep
templates/
  index.html
```

### App Server Code

`app.py` — Flask serving `index.html` via `render_template`:

```python
from flask import Flask, render_template
app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

### Theme / Domain

**Tasty Recipes Hub** — Recipe site with dishes (Spicy Pasta Arrabiata, Thai Green Curry, Mediterranean Salad), nutrition facts table, and recipe submission form.

### Dockerfile

Simple Python build:

```dockerfile
FROM python:3.12-slim
...
EXPOSE 8080
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "app:app"]
```

### Local Port

8004

### Key Accessibility Violations

Same core violation pattern. Popup text says "no way to close this with keyboard" (each app has a slightly different snarky popup message highlighting the keyboard inaccessibility).

---

## App 005 — Go — Fitness Tracker

### Tech Stack

- **Language:** Go 1.22
- **Framework:** net/http + embed (standard library only)
- **Build tool:** Go modules (go.mod)
- **No package.json** — uses `go.mod`

### Repository Structure

```text
go.mod
main.go
Dockerfile
README.md
start-local.ps1
stop-local.ps1
infra/
  main.bicep
static/
  index.html
```

### App Server Code

`main.go` — Go embed + net/http file server:

```go
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
```

### Theme / Domain

**FitTrack Pro** — Fitness tracker with workouts (HIIT Cardio Blast, Full Body Strength, Morning Yoga Flow), weekly progress table, and goal-setting form.

### Dockerfile

Multi-stage Go build:

```dockerfile
FROM golang:1.22-alpine AS build
...
FROM alpine:3.19
EXPOSE 8080
CMD ["./server"]
```

### Local Port

8005

### Key Accessibility Violations

Same core violation pattern. Popup says "good luck closing this without a mouse."

---

## Cross-Cutting Comparison

### What Is Identical Across All 5 Apps

| Aspect | Detail |
|--------|--------|
| **Purpose** | Deliberately inaccessible for testing AODA/WCAG scanner pipeline |
| **Bicep infra** | Identical `infra/main.bicep` — ACR (Basic) + App Service Plan (B1 Linux) + Web App for Containers |
| **Container port** | 8080 internal |
| **HTML template** | Same CSS, same violation patterns, same page structure |
| **Pipeline** | `.azuredevops/pipelines/a11y-scan.yml` weekly scan with SARIF output |
| **Local scripts** | `start-local.ps1` and `stop-local.ps1` (Docker-based) |
| **SARIF output** | Results published to Azure DevOps Advanced Security |

### What Differs Between Apps

| Aspect | 001 | 002 | 003 | 004 | 005 |
|--------|-----|-----|-----|-----|-----|
| **Language** | Rust | C# | Java | Python | Go |
| **Framework** | Actix-web 4 | ASP.NET 8.0 | Spring Boot 3.2 | Flask 3.0 | net/http (stdlib) |
| **Build tool** | Cargo | dotnet | Gradle | pip | Go modules |
| **Base image** | rust:1.88-slim / debian:bookworm-slim | dotnet/sdk:8.0 / aspnet:8.0 | eclipse-temurin:17 | python:3.12-slim | golang:1.22-alpine / alpine:3.19 |
| **HTML location** | static/index.html | webapp/wwwroot/index.html | src/main/resources/templates/index.html | templates/index.html | static/index.html |
| **Theme** | Travel booking | E-commerce store | Online learning | Recipe site | Fitness tracker |
| **Local port** | 8001 | 8002 | 8003 | 8004 | 8005 |
| **Unique violations** | — | Tab interface, image map | Thymeleaf xmlns | — | — |
| **Popup text** | "keyboard users: good luck" | "click anywhere or press some key maybe" | "click anywhere or press some key maybe" | "no way to close this with keyboard" | "good luck closing this without a mouse" |

### Shared WCAG Violation Categories (All 5 Apps)

1. **1.1.1 Non-text Content** — Images missing alt text
2. **1.3.1 Info and Relationships** — No semantic HTML (divs as buttons, no landmarks, no proper headings)
3. **1.4.3 Contrast (Minimum)** — Pervasive low-contrast text (e.g., #555 on #1a1a1a, #bbb on #aaa, #e0e0e0 on #f0f0f0)
4. **1.4.4 Resize Text** — Tiny font sizes (9px, 10px, 11px)
5. **2.1.1 Keyboard** — Keyboard trap via JS, divs used as buttons without tabindex
6. **2.1.2 No Keyboard Trap** — Tab key event listener does nothing
7. **2.3.1 Three Flashes or Below Threshold** — Blinking text animation (0.5s blink)
8. **2.4.1 Bypass Blocks** — No skip navigation link
9. **2.4.2 Page Titled** — Title set via JS to generic "Page"
10. **2.4.4 Link Purpose** — "click here" links
11. **2.4.6 Headings and Labels** — Heading hierarchy violations (h4 > h1 > h6)
12. **3.1.1 Language of Page** — Missing `lang` attribute on `<html>`
13. **3.3.2 Labels or Instructions** — Form inputs with placeholder only, no labels
14. **4.1.1 Parsing** — Deprecated `<font>` and `<marquee>` elements
15. **4.1.2 Name, Role, Value** — Interactive elements (buttons) are divs without ARIA roles

### App 002 Additional Violations

- Inaccessible custom tab interface (no ARIA tablist/tab/tabpanel roles)
- Inaccessible image map (`<area>` without alt text)
- Autoplaying content

---

## Key Discoveries

1. **All 5 apps are intentionally inaccessible** — built as test targets for an AODA/WCAG accessibility scanner pipeline running in Azure DevOps.
2. **Each app uses a different backend language** (Rust, C#, Java, Python, Go) but serves **essentially the same inaccessible HTML template** with only theme/domain differences.
3. **The accessibility violations are identical across all apps** — the HTML template is a reusable pattern of ~15+ WCAG violation categories.
4. **Infrastructure is identical** — all 5 use the same Bicep template deploying to Azure App Service with ACR.
5. **None use package.json** — each uses the native dependency management for its language.
6. **App 002 is the most violation-dense** — it adds tab interfaces and image maps on top of the base violation set.
7. **Local ports are sequential** — 8001 through 8005, allowing all 5 to run simultaneously for comparison testing.

## Follow-on Questions

- None identified. All original research questions are answered.

## Clarifying Questions

- None. Research is complete.

## References

- https://github.com/devopsabcs-engineering/a11y-demo-app-001
- https://github.com/devopsabcs-engineering/a11y-demo-app-002
- https://github.com/devopsabcs-engineering/a11y-demo-app-003
- https://github.com/devopsabcs-engineering/a11y-demo-app-004
- https://github.com/devopsabcs-engineering/a11y-demo-app-005
