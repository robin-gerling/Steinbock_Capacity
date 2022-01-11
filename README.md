# SteinbockUtilization

This script shows the current utilization of the bouldering hall *der Steinbock* in Constance, Germany.<br>
It also shows the median utilization of the current weekday based on data from weeks in the past.

<img src="https://github.com/r-gerling/Steinbock_Capacity/blob/main/widgetExample.png?raw=true" width="200" height="200" />

## Installation
1. Install Scriptable (only Apple) from the AppStore (https://apps.apple.com/de/app/scriptable/id1405459188)
2. Copy the content of the file ***SteinbockUtilization.js***
3. Create a new script in Scriptable <br>
:arrow_right: open Scriptable and click on the blue plus sign in the upper right corner
4. Paste the copied content from step 2. into the new script and click ```Done``` in the upper left corner
5. Rename the script (e.g. *SteinbockUtilization*)
6. Create a new Scriptable widget on the homescreen
7. Select the *SteinbockUtilization* script in the configurator

#### (Optional)
Specify the parameter day within the script configurator to show the graph of a different day as follows: *{"day": "```param```"}*<br>
| Replace *```param```* by | to get the graph of the following day |
|         :--:             |             :-----------:             |
|          0               | Sunday                                |
|          1               | Monday                                |
|          2               | Tuesday                               |
|          3               | Wednesday                             |
|          4               | Thursday                              |
|          5               | Friday                                |
|          6               | Saturday                              |
