<!DOCTYPE html>
<html>
<!-- #include file="../gral.inc" -->

<%'response.buffer=false
comentalesto = ""
medialog = "0"

Func = Request("Func")
if isempty(Func) Then Func = 1

medialog = request("m")
if isempty(medialog) Then medialog = 0


if request("m") <> "" then medialog = request("m")

titulo = "Carga PDF" & medialog

response.flush
limite = 10500000
function ParseForm(strFieldName)
	
		Set strFormData = CreateObject("Scripting.Dictionary")
		lngCount = -1
		'Try To find the Field
		lngNamePos = instr(1,strDataWhole,"name=" & chr(34) & strFieldName & chr(34))		
		
		'Parse through data In search of fields
			Do While lngNamePos <> 0
				lngCount = lngCount + 1
				lngBeginFieldData = instr(lngNamePos,strDataWhole,vbcrlf & vbcrlf)+4
				lngEndFieldData = instr(lngBeginFieldData,strDataWhole,strBoundry)-2
				strFormData.Add lngCount, mid(strDataWhole,lngBeginFieldData,lngEndFieldData-lngBeginFieldData)
				lngNamePos = instr(lngEndFieldData,strDataWhole,"name=" & chr(34) & strFieldName & chr(34))
			Loop
			
			Set ParseForm = strFormData
	End function





%>
<%
if Func = 2 then 
	nomArchivo = ""
	Tamanio = 0
	'response.buffer=false
	Server.ScriptTimeout=300
	ForWriting = 2
	adLongVarChar = 201 
	adLongVarWChar = 203
	lngNumberUploaded = 0
'Get binary data from form	
 	Dim noBytes, binData
	noBytes = Request.TotalBytes
	'Response.Write "noBytes:   " & noBytes & "<BR>"
	
'MUY IMPORTANTE... Revisa si es un tama�o permitido y procede
	if noBytes > limite then 
	
	comentalesto = comentalesto &  "<h1>No fue posible guardar su documento porque excede el l�mite de tama�o permitido de 5 MB</h1>"
	'Response.End 
	ELSE
'
	'response.write "<p>Bytes: " & nobytes
	binData = Request.BinaryRead (noBytes)
	
'convery the binary data to a string
		Set RST = CreateObject("ADODB.Recordset")
		LenBinary = LenB(binData)
	
		if LenBinary > 0 Then
			RST.Fields.Append "myBinary", adLongVarChar, LenBinary
			RST.Open
				RST.AddNew
					RST("myBinary").AppendChunk BinData
				RST.Update
			strDataWhole = RST("myBinary")
		End if
	
	
'get the boundry indicator
			strBoundry = Request.ServerVariables ("HTTP_CONTENT_TYPE")
			lngBoundryPos = instr(1,strBoundry,"boundary=") + 8 
			strBoundry = "--" & right(strBoundry,len(strBoundry)-lngBoundryPos)
	
'ParseForm returns a dictionary object
'You can ParseForm any time after the
'Boundry indicator is set.

		
			comentalesto = comentalesto & "Nombre del archivo origen: <strong>" & FileName & "</strong><BR>"
			comentalesto = comentalesto & "Tama�o: <strong>" & ParseForm("tamanio").item(0) & "</strong><BR>"
			comentalesto = comentalesto & "Tipo: <strong>" & ParseForm("extension").item(0) & "</strong><BR>"		
			SavePath = Server.mapPath("\mediarchivos\medialogs\")
'			Response.Write SavePath & "<BR>"	
			Raw= True
		
			if Raw Then
				Set fso = CreateObject("Scripting.FileSystemObject")
				nomRaw = "\" & session("usuario") & "-raw.txt"
				'Response.Write nomRaw & "<BR>"
					Set f = fso.OpenTextFile(SavePath & nomRaw, ForWriting, True)
					f.Write strDataWhole
				Set f = nothing
				Set fso = nothing
			End if
'Get first file boundry positions.
		lngCurrentBegin = instr(1,strDataWhole,strBoundry)
		lngCurrentEnd = instr(lngCurrentBegin + 1,strDataWhole,strBoundry) - 1
	
		'Response.Write "lngCurrentBegin: " & lngCurrentBegin & "<BR>"
		'Response.Write "lngCurrentEnd:   " &lngCurrentEnd & "<BR>"
		countloop = 0
		
		Do While lngCurrentEnd > 0
'Get the data between current boundry 
'and remove it from the whole.
			strData = mid(strDataWhole,lngCurrentBegin, (lngCurrentEnd - lngCurrentBegin) + 1)
			'Remove the file data from the whole	
					'strDataWhole = replace(strDataWhole,strData,"")
		
				
'Get the full path of the current file.
			lngBeginFileName = instr(1,strdata,"filename=") + 10
			lngEndFileName = instr(lngBeginFileName,strData,chr(34)) 
'Make sure they selected at least one file.	
			if lngBeginFileName = lngEndFileName and lngNumberUploaded = 0 Then
	
				comentalesto = comentalesto &  "<H2> Ha ocurrido un error.</H2>"
				comentalesto = comentalesto &  "Debe seleccionar un archivo para adjuntar"
				Response.End 
			End if
'There could be one or more empty file boxes.	
			if lngBeginFileName <> lngEndFileName and lngBeginFileName - 10 <> 0 Then
				strFilename = mid(strData,lngBeginFileName,lngEndFileName - lngBeginFileName)
'Creates a raw data file with data 
'between current boundrys. Uncomment 
'for debuging.
	
'Loose the path information and keep 
'just the file name.	
				tmpLng = instr(1,strFilename,"\")
				Do While tmpLng > 0
					PrevPos = tmpLng
					tmpLng = instr(PrevPos + 1,strFilename,"\")
				Loop
				
				FileName = right(strFilename,len(strFileName) - PrevPos)
				'FileName = session("Cliente")*9 & "-" & FileName
				'FileName = medialog
	
'Get the begining position of the file 
'data sent.
'if the file type is registered with 
'the browser then there will be a 
'Content-Type
				lngCT = instr(1,strData,"Content-Type:")
	
					if lngCT > 0 Then
						lngBeginPos = instr(lngCT,strData,chr(13) & chr(10)) + 4
					Else
						lngBeginPos = lngEndFileName
					End if
'Get the ending position of the file 
'data sent.
				lngEndPos = len(strData) 
		
'Calculate the file size.	
				lngDataLenth = (lngEndPos - lngBeginPos) -1
'Get the file data	
				strFileData = mid(strData,lngBeginPos,lngDataLenth)
'Create the file.	
				Set fso = CreateObject("Scripting.FileSystemObject")
				'Set f = fso.OpenTextFile(SavePath & "\" & FileName, ForWriting, True)
				Set f = fso.OpenTextFile(SavePath & "\" & ParseForm("nomArchivo").item(0), ForWriting, True)
				f.Write strFileData
				Set f = nothing
				Set fso = nothing
		
		
			
				if lngNumberUploaded = 0 Then
				if ParseForm("fDocumento").item(0) <> "" then fDocumento = ParseForm("fDocumento").item(0)
				cabeza = ParseForm("cabeza").item(0)
					comentalesto = comentalesto & "<STRONG>Guardando Adjunto...</STRONG><BR><BR>"
					comDoc = "INSERT INTO DocsClientes (Cliente, nCliente, Usuario, Visible, Cabeza, Adjunto, Extensi�n, FechaDocumento, FechaCarga, Tama�o, Virtual, Texto) " & _
							  "VALUES ('" & session("Cliente") & "', " & _
							  "'" & session("nombreCliente") & "', " & _
							  "'" & session("Usuario") & "', 'SI', " & _
							  "'" & ParseForm("cabeza").item(0) & "', " & _
	  						  "'" & FileName & "', " & _
							  "'" & ParseForm("extension").item(0) & "', '" & fDocumento & "', getDate(),  " & _
	  						  "'" & ParseForm("tamanio").item(0) & "', '/mediarchivos/medialogs', " & _
	  						  "'" & ParseForm("texto").item(0) & "') " 
  					'Response.Write "<STRONG>COMANDO: </STRONG><BR><BR>" & comDoc & "<br>"	  
	  					'rs.open comDoc, dsn
	  					call registro_accesos("PORTALES",left("CARGA DOCUMENTO " & FileName,50) ,cint(session("Cliente")))
				End if
				comentalesto = comentalesto & "Nombre del archivo destino: <strong>" &  ParseForm("nomArchivo").item(0) & "</strong><BR>"
		
		
				lngNumberUploaded = lngNumberUploaded + 1
	
		End if
		
'Get then next boundry postitions if 
'any.
		lngCurrentBegin = lngCurrentEnd
		lngCurrentEnd = instr(lngCurrentBegin + 9 ,strDataWhole,strBoundry) - 1
	
	'Prevents infinate loop.
		countloop = countloop + 1
		if countloop = 100 Then
			Response.Write "Hubo error en la carga de archivos. LOOP"
			'Close the Log
		
			Response.End 
		End if
		loop

		if lngNumberUploaded > 0 then 	comentalesto = comentalesto &  "<STRONG>" & lngNumberUploaded & " archivo adjunto cargado</STRONG>"
					
		'Response.Write "Termin� de Guardar<BR>"
END IF 'de que si est� en el par�metro
end if
%>
<html>
<head>
<!-- #include file="../serrat/elHeader.asp" -->

</head>
<!-- MODAL PORTALES -->
<body onload="DatosArchivo()">
<div class="w3-container w3-grey">


<div id="wrapper">
<div id="ventana">


<h1>Cargar PDF para Medialog <%=medialog%></h1>

<form name="cargaPDF" method="post" enctype="multipart/form-data" 
action="CargaPDF.asp?Func=2" language="JavaScript">

<table class="w3-table w3-bordered w3-white">
	<tr>
		<td width=35%>N�mero de Medialog</td>
		<td width=65%>
			<input class="w3-input" type="text" id="m", name="m" value="<%=medialog%>">
		</td>
	</tr>
	<tr>
		<td >Nombre del documento</td>
		<td >
			<input class="w3-input" type="text" id=texto cols=55 rows=5>
		</td>
	</tr>		
	<tr>
		<td>Cargar archivo</td>
		<td >
			<input class="w3-input w3-blue w3-round" type="file"  id="file1" name="file1" 
			onchange="DatosArchivo()">
		</td>


</tr>

<input type=hidden id="nomArchivo", name="nomArchivo">
<input type=hidden id="tamanio", name="tamanio">
<input type=hidden id="extension", name="extension">



    
	<tr>
		<td>Datos del Adjunto</td>
		<td><label id=comentaOrigen></label></td>
	</tr>
	<tr>
		<td colspan=2>
		<input class="w3-button w3-center w3-green" type="submit" name="Guardar" id="Guardar" value="Guardar"></td>
	</tr>
	<tr>
		<td colspan=2><%=comentalesto%></td>
	</tr>

</table>
</form>
<script>
function DatosArchivo(){
    var x = document.getElementById("file1");
	var numNota = document.getElementById("m").value;
	var nombreDestino = document.getElementById("nomArchivo")
    var txt = "";
    if ('files' in x) {
        if (x.files.length == 0) {
            txt = "Seleccione el archivo a cargar.";
        } else {
            for (var i = 0; i < x.files.length; i++) {
               
	                txt += "Origen: <strong>" + x.value + "</strong><br>";
	                var file = x.files[i];
	          
				    if ('name' in file) {
	                    txt += "Nombre: <strong>" + file.name + "</strong><br>";
	                }
	                if ('size' in file) {
	                    txt += "Tama�o: <strong>" + file.size + " bytes </strong><br>";
	
	                }
	                if ('mediaType' in file) {
	                    txt += "Tipo: </strong>" + file.mediaType + "</strong><br />";
	                }

	                
	                
					var ext = x.value;
					ext = ext.substring(ext.length-4,ext.length);
					var punto = ext.substring(0,1);
					
					if (punto == '.' )
						{
						ext = ext.substring(1,4);
						}
					ext = ext.toLowerCase();
	
	               nombreDestino.value = numNota + "." + ext;	
	    		   document.getElementById("tamanio").value = file.size;
	    		   document.getElementById("extension").value = ext;
	    		   document.getElementById("texto").value = file.name;
				   
	                txt += "NOMBRE DESTINO: </strong>" + numNota + "." + ext + "</strong><br />";
	               
	     	}
		}
    } /*de si archivos*/
    else {
        if (x.value == "") {
            txt += "Seleccione el archivo a cargar";
        } else {
            txt += "Esta herramienta no est� soportada por su browser, intente con otro explorador";
        }
    } /*de si archivos else*/
    

    document.getElementById("comentaOrigen").innerHTML = txt;

} /*de la funci�n*/
</script>

</div>
</div>
</body>
</html>
