var app=WebApplication.CreateBuilder(args).Build();
app.MapGet("/",()=>Results.Json(new { sum=42 }));
app.MapGet("/health",()=>Results.Json(new { sum=42 }));
app.Run();
