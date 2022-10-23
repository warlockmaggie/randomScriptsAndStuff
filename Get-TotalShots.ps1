function Get-TotalShots
{
    [CmdletBinding()]
    Param
    (
        [Parameter(Mandatory)] 
        $MagSize,
        [Parameter(Mandatory)]
        [ValidateSet("TripleTap","FttC","Both")]
        $Mode
    )
    $TotalShots = $ExtraShots = 0

    switch($mode)
    {
        "TripleTap" {
            $ExtraShots += [Math]::Floor( ($MagSize-1)/2 )
            $TotalShots = $MagSize + $ExtraShots
            break;
        }
        "FttC" {
            $ExtraShots += $MagSize-2-($MagSize % 2)
            $TotalShots = $MagSize + $ExtraShots
            break;
        }
        "Both" {
            $TotalShots = 6*($MagSize-2)-[Math]::Pow(-1,$MagSize)
            #$TotalShots = (($MagSize-4)*6)+(($MagSize % 2)*2)+11
            $ExtraShots = $TotalShots - $MagSize
            break;
        }
        default {
            Write-Error "Mode was either not specified or an invalid value" 
        }
    }
    write-host "With a starting mag size of $MagSize and using $Mode, you will get:"
    write-host "Extra Shots: $ExtraShots"
    write-host "Total Shots: $TotalShots"
}