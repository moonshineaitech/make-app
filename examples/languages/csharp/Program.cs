using System;
class Program { static void Main(string[] args) { int total=0; foreach(string arg in args) total+=int.Parse(arg); Console.WriteLine("APPDOCK_SUM="+total); } }
