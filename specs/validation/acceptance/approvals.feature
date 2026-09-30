Feature: Manager approvals

  @story-8
  Rule: A manager sees pending claims from their own team, with any flags

    Scenario: The approval queue lists a report's pending claim and its flag
      Given Ruwan the employee reports to Malith the manager
      And Ruwan has submitted a meals claim for "Highland Outing Resort" that is flagged over the monthly cap
      When Malith opens his approval queue
      Then he sees the claim for "Highland Outing Resort" with its policy flag

    @negative
    Scenario: A manager does not see another team's pending claims
      Given Nadeeka the employee reports to Sanduni the manager, not to Malith
      And Nadeeka has submitted a claim for "Ceylon Cabs"
      When Malith the manager opens his approval queue
      Then he does not see a claim for "Ceylon Cabs"

  @story-9
  Rule: A manager decides each pending claim with a comment

    Scenario: Approving a claim records the decision
      Given Ruwan the employee reports to Malith the manager
      And Ruwan has a pending claim for "Spice Garden Restaurant"
      When Malith approves it with the comment "Reasonable, approved"
      Then the claim for "Spice Garden Restaurant" shows status "Approved" with the comment "Reasonable, approved"

    Scenario: Rejecting a claim records the decision
      Given Ruwan the employee reports to Malith the manager
      And Ruwan has a pending claim for "Highland Outing Resort" that is flagged over the monthly cap
      When Malith rejects it with the comment "Over the monthly cap, please resubmit next month"
      Then the claim for "Highland Outing Resort" shows status "Rejected" with the comment "Over the monthly cap, please resubmit next month"

    @negative
    Scenario: A manager cannot decide a claim outside their own team
      Given Nadeeka the employee reports to Sanduni the manager, not to Malith
      And Nadeeka has a pending claim for "Ceylon Cabs"
      When Malith the manager tries to decide Nadeeka's claim for "Ceylon Cabs"
      Then the claim for "Ceylon Cabs" still shows status "Submitted"
