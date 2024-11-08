# Random Scripts and Stuff
## Get-TotalShots.ps1
### Usage

Run the script in a Powershell window and then call the Get-TotalShots cmdlet.

Parameters:
- MagSize (Magazine Size)
- Reserves (Full Reserve count for your target weapon)
- TripleTap (Flag to enable Triple Tap)
- FttC (Flag to enable Fourth Time's the Charm)
- Rewind (Flag to enable Rewind Rounds)

Please note that you cannot use all three flags

#### Examples
```
PS> Get-TotalShots -MagSize 6 -Reserves 23 -FttC -Rewind     

  With a starting mag size of 6
  and 23 reserves
  you get 47 total shots

PS> Get-TotalShots -MagSize 6 -Reserves 23 -TripleTap -Rewind        

  With a starting mag size of 6
  and 23 reserves
  you get 40 total shots

PS> Get-TotalShots -MagSize 6 -Reserves 23 -TripleTap -FttC

  With a starting mag size of 6
  you get 23 total shots

```

