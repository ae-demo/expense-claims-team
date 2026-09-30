Feature: Finance policy management and organization-wide spend

  @story-10
  Rule: Finance/Admin edits the spending policy's limits

    Scenario: Raising a category's monthly cap
      Given the meals policy rule caps meals at "20000" LKR per month
      When Dilani from Finance/Admin changes the meals cap to "25000" LKR per month
      Then the meals policy rule shows a monthly cap of "25000" LKR

    Scenario: Adding a new policy rule
      Given no policy rule exists for office supplies
      When Dilani from Finance/Admin adds an office supplies rule capped at "10000" LKR per month
      Then the policy rules list shows an office supplies rule capped at "10000" LKR per month

  @story-11
  Rule: Finance/Admin sees claims across every team

    Scenario: The all-claims view spans more than one manager's team
      Given Ruwan the employee reports to Malith the manager and Nadeeka the employee reports to Sanduni the manager
      And Ruwan has submitted a claim for "Spice Garden Restaurant" and Nadeeka has submitted a claim for "Ceylon Cabs"
      When Dilani from Finance/Admin opens the all-claims view
      Then she sees both the claim for "Spice Garden Restaurant" and the claim for "Ceylon Cabs"

    @negative
    Scenario: A manager cannot reach the organization-wide view
      Given Malith the manager is signed in
      When he tries to open the all-claims view
      Then he cannot reach it
