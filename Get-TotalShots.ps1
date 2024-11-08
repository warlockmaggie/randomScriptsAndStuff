function TripleTap($MagSize, $FttC)
{
    if(!$FttC)
    {
        $ExtraShots += [Math]::Floor( ($MagSize-1)/2 )
        $TotalShots = $MagSize + $ExtraShots
        Write-Verbose "TT'd from $MagSize to $TotalShots"
        Write-Output $TotalShots
    }
    else {
        write-output 0
    }
}

function FourthTimes
{
    [CmdletBinding()]
    Param(
        [Parameter()]
        [int]$MagSize,
        [Parameter()]
        [switch]$TripleTap
    )

    if(!$TripleTap)
    {
        $ExtraShots += $MagSize-2-($MagSize % 2)
        $TotalShots = $MagSize + $ExtraShots                
    }
    else
    {
        $TotalShots = 6*($MagSize-2)-[Math]::Pow(-1,$MagSize)
    }
    Write-Verbose "Fourthed from magsize $MagSize to $TotalShots"
    Write-Output $TotalShots
}

function Get-TotalShots
{
    [CmdletBinding()]
    Param
    (
        [Parameter(Mandatory)]
        [int]$MagSize,
        [Parameter(Mandatory)]
        [int]$Reserves,
        [Parameter()] 
        [switch]$TripleTap,
        [Parameter()]
        [switch]$FttC,
        [Parameter()]
        [switch]$Rewind
    )

    if($TripleTap -and $FttC -and $Rewind)
    {
        write-error "Cannot have Rewind Rounds with Triple Tap AND Fourth Times..."
        exit
    }
    write-host "With a starting mag size of $MagSize"
    $ogReserves = $Reserves
    switch($true)
    {
        $TripleTap
        {
            $hits += TripleTap $MagSize $FttC
        }
        $FttC
        {
            $hits += FourthTimes -MagSize $MagSize -TripleTap:$TripleTap
        }
        $Rewind
        {
            write-host "and $ogReserves reserves"
            $replacedMag = [Math]::Round(($hits*.6),[System.MidpointRounding]::ToPositiveInfinity)
            while($Reserves -gt 0)
            {
                $tempHits = 0
                if($replacedMag -gt $MagSize)
                {
                    $replacedMag = $MagSize
                }

                if($replacedMag -gt $Reserves)
                {
                    $replacedMag = $Reserves
                }
                $Reserves -= $replacedMag

                if($TripleTap)
                {
                    $tempHits += TripleTap $replacedMag $FttC
                }
                elseif($FttC)
                {
                    $tempHits += FourthTimes -MagSize $replacedMag -TripleTap:$TripleTap
                }
                else
                {
                    $tempHits += $replacedMag
                }
                $hits += $tempHits
                $replacedMag = [Math]::Round(($tempHits*.6),[System.MidpointRounding]::ToPositiveInfinity)
                if($replacedMag -lt ($MagSize*.2875))
                {
                    break
                }
            }
        }
    }
    write-host "you get $Hits total shots"
}
