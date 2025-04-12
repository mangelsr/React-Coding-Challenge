import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import * as utils from '../utils';

class BalanceOutput extends Component {
  render() {
    if (!this.props.userInput.format) {
      return null;
    }

    return (
      <div className='output'>
        <p>
          Total Debit: {this.props.totalDebit} Total Credit: {this.props.totalCredit}
          <br />
          Balance from account {this.props.userInput.startAccount || '*'}
          {' '}
          to {this.props.userInput.endAccount || '*'}
          {' '}
          from period {utils.dateToString(this.props.userInput.startPeriod)}
          {' '}
          to {utils.dateToString(this.props.userInput.endPeriod)}
        </p>
        {this.props.userInput.format === 'CSV' ? (
          <pre>{utils.toCSV(this.props.balance)}</pre>
        ) : null}
        {this.props.userInput.format === 'HTML' ? (
          <table className="table">
            <thead>
              <tr>
                <th>ACCOUNT</th>
                <th>DESCRIPTION</th>
                <th>DEBIT</th>
                <th>CREDIT</th>
                <th>BALANCE</th>
              </tr>
            </thead>
            <tbody>
              {this.props.balance.map((entry, i) => (
                <tr key={i}>
                  <th scope="row">{entry.ACCOUNT}</th>
                  <td>{entry.DESCRIPTION}</td>
                  <td>{entry.DEBIT}</td>
                  <td>{entry.CREDIT}</td>
                  <td>{entry.BALANCE}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    );
  }
}

BalanceOutput.propTypes = {
  balance: PropTypes.arrayOf(
    PropTypes.shape({
      ACCOUNT: PropTypes.number.isRequired,
      DESCRIPTION: PropTypes.string.isRequired,
      DEBIT: PropTypes.number.isRequired,
      CREDIT: PropTypes.number.isRequired,
      BALANCE: PropTypes.number.isRequired
    })
  ).isRequired,
  totalCredit: PropTypes.number.isRequired,
  totalDebit: PropTypes.number.isRequired,
  userInput: PropTypes.shape({
    startAccount: PropTypes.number,
    endAccount: PropTypes.number,
    startPeriod: PropTypes.date,
    endPeriod: PropTypes.date,
    format: PropTypes.string
  }).isRequired
};

export default connect(state => {
  let { startAccount, endAccount, startPeriod, endPeriod } = state.userInput;

  if (isNaN(startAccount)) {
    if (state.accounts.length > 0) {
      startAccount = state.accounts[0].ACCOUNT;
    }
  }

  if (isNaN(endAccount)) {
    if (state.accounts.length > 0) {
      endAccount = state.accounts[state.accounts.length - 1].ACCOUNT;
    }
  }

  if (isNaN(startPeriod)) {
    if (state.journalEntries.length > 0) {
      startPeriod = state.journalEntries[0].PERIOD;
    }
  }

  if (isNaN(endPeriod)) {
    if (state.journalEntries.length > 0) {
      endPeriod = state.journalEntries[state.journalEntries.length - 1].PERIOD;
    }
  }

  const accountsDict = new Map();
  for (const account of state.accounts) {
    if (account.ACCOUNT >= startAccount && account.ACCOUNT <= endAccount) {
      accountsDict.set(account.ACCOUNT, account.LABEL);
    }
  }
  const accountNumbers = [...accountsDict.keys()];

  const balance = state.journalEntries
    .filter((journal) => {
      const isValidAccount = accountNumbers.includes(journal.ACCOUNT);
      const isOnPeriod =
        journal.PERIOD >= startPeriod && journal.PERIOD <= endPeriod;
      return isValidAccount && isOnPeriod;
    })
    .reduce((acc, current) => {
      const idx = acc.findIndex((v) => v.ACCOUNT === current.ACCOUNT);
      if (idx === -1) {
        current.BALANCE = current.DEBIT - current.CREDIT;
        acc.push(current);
      } else {
        acc[idx].DEBIT += current.DEBIT;
        acc[idx].CREDIT += current.CREDIT;
        acc[idx].BALANCE = acc[idx].DEBIT - acc[idx].CREDIT;
      }
      return acc;
    }, [])
    .map((journal) => {
      return {
        ACCOUNT: journal.ACCOUNT,
        DESCRIPTION: accountsDict.get(journal.ACCOUNT),
        DEBIT: journal.DEBIT,
        CREDIT: journal.CREDIT,
        BALANCE: journal.BALANCE,
      };
    })
    .sort((j1, j2) => j1.ACCOUNT - j2.ACCOUNT);

  const totalCredit = balance.reduce((acc, entry) => acc + entry.CREDIT, 0);
  const totalDebit = balance.reduce((acc, entry) => acc + entry.DEBIT, 0);

  return {
    balance,
    totalCredit,
    totalDebit,
    userInput: state.userInput
  };
})(BalanceOutput);
