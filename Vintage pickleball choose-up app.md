Vintage pickleball choose-up app  
  
These are the requirements for an app titled “Vintage Club Pickleball”.  It is a web app hosted on github pages, using the Supabase free tier of service for data storage.    
  
The app features two main sections.   One page or tab shows a list of all Vintage Club members and guests, along with their pickleball rankings.  Guests can be easily added or deleted.  Members can be easily added or deleted. The pickleball ranking for each person can be edited.  The ranking could be a DUPR ranking, some other numeric ranking, or a letter grade.  Each person can be checked to indicate whether they participate in pickleball.  The list of people can be sorted by any field.  Every person has a gender field as well.  
  
The second page or tab shows a pickleball event on a particular date.  You can see a list of past events and click on each to view its details.  You can delete a past event or add a new one.  When adding a new one you provide a date and name, the default date is today’s date and the default name is Chooseup.    
  
Each event will have 1 or more rounds of play.  Rounds can be added or deleted.  
  
Each round of play will show:  
- the list of pickleball participants from the first tab.   and each participant can be selected to be involved in this round of play  
- the list of 8 courts, numbered 1-8, and the assignments of players to each court.   each court takes 4 players split in 2 sides of 2.   initially there are no players assigned to any court.  each court has a checkbox to allow it to be included or excluded from this round of play.  
- When a round is complete, the winning team can be noted in the app.  
- There is a button called “suggest” that will assign players to courts.  when clicked, the app will look at the players participating in this round, and will assign them to courts.  additionally there are checkboxes that can modify the assignment process:  
    - a “Member Priority” checkbox will insure that all Vintage members are assigned, and will add in guests as space is available.  If this box is not checked, member or guest status will not be considered.  
    - a “Gender Priority” checkbox will attempt to assign players to courts based on gender — ie each court will contain only men or women as possible.    
    - A “Rank Priority” checkbox will assign players based on rank.  Best ranked players to court 1, lowest ranked to court 8.  
    - A “Social Priority” checkbox will assign players based on social mixing.  Each court will attempt to have players that have not played together recently.  
    - A “Mixed Priority” will assign players based on rank to the top 3, middle 3, or bottom 2 courts, and then will mix randomly within those courts.  
    - A “River Mode” will assign players based on results of the prior round.  winning teams will move up a court and split, losing teams will move down a court and split.  Court 1 winners will stay on court 1, and the lowest court losers will stay on the lowest court.  
- Once a suggestion is made, it is easy to adjust the suggestion in 3 ways  
    - any player can be swapped with any other player  
    - players can easily be moved between the two teams on a court.  
- if the user doesn’t like the current assignments, they can hit the “suggest” button again and get new proposed assignments.  
- When the user is satisfied with round assignments, they can “commit” them and the round is saved, and the winners can be noted later.  
  
  
  
  
  
   
  
  
