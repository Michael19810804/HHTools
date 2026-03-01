$url = "https://functions2.memfiredb.com/d6c963og91hgk1gnqgc0/send_email"
$body = @{
    to = "feihuo0804@gmail.com"
    subject = "Cloud Function Test"
    text = "This is a test from the terminal."
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
    Write-Host "Success!"
    $response | Format-List
} catch {
    Write-Host "Error:"
    $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.ReadToEnd()
    }
}
