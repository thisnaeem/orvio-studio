# One plain-text target per process. Never logs field content.
[Console]::InputEncoding=[System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$field=$null; $original=''; $last=''; $selectionStart=0; $selectionLength=0; $canLive=$false; $pattern=$null
while ($line=[Console]::ReadLine()) {
 try {
  $p=$line | ConvertFrom-Json; $result=@{ok=$false}
  if ($p.action -eq 'capture') {
   $field=[System.Windows.Automation.AutomationElement]::FocusedElement
   if ($null -eq $field) {$result=@{live=$false;tracked=$false}}
   elseif ($field.Current.IsPassword) {$result=@{live=$false;tracked=$true;protected=$true}}
   else {
    $pattern=$null; $textPattern=$null
    $canLive=$field.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern,[ref]$pattern) -and -not $pattern.Current.IsReadOnly
    if ($canLive) {
     $original=$pattern.Current.Value; $last=$original
     $canLive=$original.Length -le 100000 -and $field.TryGetCurrentPattern([System.Windows.Automation.TextPattern]::Pattern,[ref]$textPattern)
     if ($canLive) {
      $ranges=$textPattern.GetSelection(); $canLive=$ranges.Length -eq 1
      if ($canLive) {
       $before=$textPattern.DocumentRange.Clone(); $before.MoveEndpointByRange([System.Windows.Automation.TextPatternRangeEndpoint]::End,$ranges[0],[System.Windows.Automation.TextPatternRangeEndpoint]::Start)
       $selectionStart=$before.GetText(-1).Length; $selectionLength=$ranges[0].GetText(-1).Length
       $canLive=($selectionStart+$selectionLength) -le $original.Length
      }
     }
    }
    $result=@{live=$canLive;tracked=$true}
   }
  } else {
   $focused=[System.Windows.Automation.AutomationElement]::FocusedElement
   $same=$null -ne $field -and $null -ne $focused -and [System.Windows.Automation.Automation]::Compare($field,$focused)
   if (-not $same) {$result=@{ok=$false;reason='focus'}}
   elseif ($p.action -eq 'check') {$result=@{ok=$true}}
   elseif (-not $canLive) {$result=@{ok=$false;reason='unsupported'}}
   elseif ($pattern.Current.Value -ne $last) {$result=@{ok=$false;reason='changed'}}
   else {
    $value=if($p.action -eq 'rollback') {$original} else {$original.Substring(0,$selectionStart)+[string]$p.text+$original.Substring($selectionStart+$selectionLength)}
    $pattern.SetValue($value);$last=$value;$result=@{ok=$true}
   }
  }
  @{id=$p.id;result=$result} | ConvertTo-Json -Compress -Depth 3 | ForEach-Object {[Console]::WriteLine($_)}
 } catch { @{id=$p.id;result=@{ok=$false;live=$false;tracked=$false}} | ConvertTo-Json -Compress | ForEach-Object {[Console]::WriteLine($_)} }
}
