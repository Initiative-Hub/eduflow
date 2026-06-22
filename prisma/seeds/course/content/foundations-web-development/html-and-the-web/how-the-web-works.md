## How the Web Works

Every website starts with a request for a resource. The user may see a simple address bar, but the browser is doing several jobs: interpreting the URL, finding the server, asking for a document, downloading related files, and turning all of that into an interactive page.

### The request path

A URL usually includes a protocol, a host, a path, and sometimes query parameters. The protocol tells the browser how to communicate. The host is translated into a network address through DNS. The path identifies the resource being requested.

When the browser sends an HTTP request, it includes a method such as `GET`, request headers, and sometimes a body. The server answers with a status code, response headers, and often a body such as HTML, JSON, an image, or a stylesheet.

- `200` usually means the request succeeded.
- `301` or `302` means the browser should follow a redirect.
- `404` means the requested resource was not found.
- `500` means the server failed while handling the request.

### From HTML to a page

The first HTML response is only the beginning. As the browser parses the document, it discovers linked resources and requests them too. CSS affects layout and visual presentation. JavaScript can respond to events, request more data, and update the document after the first load.

```html
<!doctype html>
<html lang="en">
  <head>
    <link rel="stylesheet" href="/styles.css" />
    <script src="/app.js" defer></script>
  </head>
  <body>
    <h1>Welcome</h1>
  </body>
</html>
```

In this example, the HTML triggers separate requests for `styles.css` and `app.js`. If either file is missing, the page may still load but look wrong or behave differently.

### Reading developer tools

The Network panel shows each request, its timing, status, size, and response headers. Use it when a page is slow, a script does not run, or an image is missing. Start with the first failed request instead of guessing.

> A web page is not one file. It is an assembled result of many resource requests and browser decisions.

### Practice checklist

- [ ] Open the Network panel before reloading a page.
- [ ] Identify the main HTML document.
- [ ] Find one stylesheet, one script, and one image.
- [ ] Compare a successful request with a failed or redirected request.

### Guided practice

Choose a familiar website and reload it with the Network panel open. Write down the first five requests, their status codes, and their resource types. Then explain which request gave the browser the initial document and which requests improved presentation or behavior.

### Key takeaway

Understanding requests and responses connects URLs, servers, HTML, CSS, JavaScript, debugging, and deployment into one system.
