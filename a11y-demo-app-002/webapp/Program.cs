var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseStaticFiles();

app.MapGet("/", () =>
{
    var filePath = Path.Combine(app.Environment.WebRootPath, "index.html");
    return Results.File(filePath, "text/html");
});

app.Run();
