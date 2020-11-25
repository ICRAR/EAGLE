import { Selector, t } from 'testcafe';

class GitHub {
  constructor () {
    this.accountIcon = Selector('.Header-item.position-relative.mr-0');
    this.accountDropdown = Selector('.Header-item.position-relative.mr-0.d-none.d-md-flex');
    this.accountSettings = Selector('.dropdown-item').withText('Settings');
    this.accountDevSettings = Selector('.menu-item').withText('Developer settings');

    this.accountTokens = Selector('.menu-item').withText('Personal access tokens');
    this.genNewToken = Selector('.btn-sm').withText('Generate new token');
    this.tokenDescription = Selector('#oauth_access_description');
    this.tokenScopeRepo = Selector('.token-scope').withText('repo');
    this.tokenScopeReadPK = Selector('.token-scope').withText('read:public_key');
    this.tokenScopeReadUser = Selector('.token-scope').withText('read:user');
    this.confirmTokenGen = Selector('.btn.btn-primary').withText('Generate token');
    this.copyToken = Selector('.octicon.octicon-clippy');
  }

  async developerSettings () {
    await t
      .click(this.accountDropdown)
      .click(this.accountSettings)
      .click(this.accountDevSettings);
  }

  async generateNewToken () {
    await t
      .click(this.accountTokens)
      .click(this.genNewToken);
  }

  async setTokenScope (description) {
    await t
      .typeText(this.tokenDescription, description)
      .click(this.tokenScopeRepo)
      .click(this.tokenScopeReadPK)
      .click(this.tokenScopeReadUser)
      .click(this.confirmTokenGen);
  }
}

export default new GitHub();
