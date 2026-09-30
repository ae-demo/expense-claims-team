Feature: Policy flagging

  @story-6
  Rule: A claim that breaks a policy rule is flagged with a plain-language reason before it is submitted

    Scenario: A draft over the monthly cap is flagged while still being filled in
      Given the meals policy rule caps meals at "20000" LKR per month
      And Ruwan the employee has already claimed "15000" LKR of meals this month
      When he fills in a new meals claim for "8000" LKR, before submitting it
      Then the claim form shows a flag that meals this month would go over the "20000" LKR cap

    Scenario: A draft within the cap shows no flag
      Given the meals policy rule caps meals at "20000" LKR per month
      And Ruwan the employee has not claimed any meals this month
      When he fills in a new meals claim for "8000" LKR, before submitting it
      Then the claim form shows no policy flag

  @story-6
  Rule: A submitted claim that breaks a policy rule is flagged with the reason

    Scenario: An over-cap claim is flagged once submitted
      Given the meals policy rule caps meals at "20000" LKR per month
      And Ruwan the employee has already claimed "15000" LKR of meals this month
      When he submits a new meals claim for "8000" LKR
      Then the claim shows a flag that meals this month went over the "20000" LKR cap

    Scenario: A within-cap claim carries no flag once submitted
      Given the meals policy rule caps meals at "20000" LKR per month
      And Ruwan the employee has not claimed any meals this month
      When he submits a new meals claim for "8000" LKR
      Then the claim carries no flag
