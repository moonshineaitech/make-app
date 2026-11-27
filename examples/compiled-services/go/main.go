package main
import("net/http";"os")
func main(){http.HandleFunc("/",func(w http.ResponseWriter,r *http.Request){w.Header().Set("Content-Type","application/json");w.Write([]byte(`{"sum":42}`))});if err:=http.ListenAndServe("127.0.0.1:"+os.Getenv("PORT"),nil);err!=nil{panic(err)}}
