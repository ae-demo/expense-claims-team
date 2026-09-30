Feature: Expense claim submission

  @story-2 @story-3
  Rule: Uploading a receipt fills in the claim's fields automatically

    Scenario: Fields are read from an uploaded receipt
      Given Ruwan the employee has uploaded a photo of a receipt from "Spice Garden Restaurant" dated "2026-09-12" for "8500" LKR
      When the receipt is read
      Then the claim form shows merchant "Spice Garden Restaurant", date "2026-09-12", total "8500" and a category

  @story-4
  Rule: Ruwan the employee may correct any auto-filled field before submitting

    Scenario: Correcting an auto-filled total
      Given Ruwan the employee's claim form was auto-filled with a total of "8500"
      When Ruwan changes the total to "8000" before submitting
      Then the submitted claim shows a total of "8000"

  @story-5
  Rule: Ruwan the employee adds a short note on the business purpose of a claim

    Scenario: The note is carried onto the submitted claim
      Given Ruwan the employee has filled in a claim for "Spice Garden Restaurant"
      When he adds the note "Team lunch with design contractors" and submits
      Then the submitted claim shows the note "Team lunch with design contractors"

  @story-7
  Rule: Ruwan the employee sees their own claims and each one's status

    Scenario: A submitted claim appears with status Submitted
      Given Ruwan the employee has submitted a claim for "Spice Garden Restaurant"
      When he opens his claims list
      Then the claim for "Spice Garden Restaurant" shows status "Submitted"

    @negative
    Scenario: An employee cannot see another employee's claims
      Given Nadeeka the employee has submitted a claim for "Kandy Rail Travel"
      When Ruwan the employee opens his own claims list
      Then he does not see a claim for "Kandy Rail Travel"
