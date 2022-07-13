import React from 'react';
import { Form, Button, Alert } from 'react-bootstrap';




function Login() {
  return (
    <main className='flex-row justify-center mb-4'>
      <div className='col-12 col-md-6'>
        <div className='card'>
          <h4 className='card-header'>Login</h4>
          <div className='card-body'>
            <form>
              <input
                className='form-input'
                placeholder='Your email'
                name='email'
                type='email'
                id='email'
                
              />
              <input
                className='form-input'
                placeholder='Password'
                name='password'
                type='password'
                id='password'
                
              />
              <button className='btn d-block w-100' type='submit'>
                Submit
              </button>
            </form>
          
          </div>
        </div>
      </div>
    </main>
  )
}

export default Login;