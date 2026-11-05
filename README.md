PS C:\Users\lares\fitcore-backend> $respuesta = Invoke-WebRequest http://localhost:3000/api/v1/health
>> $respuesta.StatusCode
>> $respuesta.Content

Advertencia de seguridad: riesgo de 
ejecución de script
Invoke-WebRequest analiza el 
contenido de la página web. El código
 de script de la página web se puede 
ejecutar cuando se analiza la 
página.
      ACCIÓN RECOMENDADA:
      Usa el modificador 
-UseBasicParsing para evitar la 
ejecución de código de script.

      ¿Quieres continuar?
                                      
[S] Sí  [O] Sí a todo  [N] No         
[T] No a todo[U] Suspender            
[?] Ayuda                             
(el valor predeterminado es "N"):O    
200
{"status":"ok","service":"fitcore-backend"}
PS C:\Users\lares\fitcore-backend> npm run build
>> git check-ignore .env
>> git status --short

> fitcore-backend@1.0.0 build
> tsc

.env
?? package-lock.json
?? package.json
?? sample.env
?? src/
?? tsconfig.json
PS C:\Users\lares\fitcore-backend> 