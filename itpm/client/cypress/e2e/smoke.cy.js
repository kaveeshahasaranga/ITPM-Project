describe("HostelMate", () => {
  it("loads login page", () => {
    cy.visit("/");
    cy.contains("HostelMate");
    cy.contains("Login");
  });
});
