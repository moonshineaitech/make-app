package main
import("fmt";"os";"strconv")
func main(){sum:=0;for _, arg:=range os.Args[1:]{n,err:=strconv.Atoi(arg);if err!=nil{panic(err)};sum+=n};fmt.Printf("APPDOCK_SUM=%d\n",sum)}
