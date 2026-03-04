

class Users{
    constructor(userName, Email, Password, Phone, Role){
        this.userName = userName;
        this.Email = Email;
        this.Password = Password;
        this.Phone = Phone;
        this.Role = Role;
    }
    getName(){
        return this.userName;
    }
    getEmail(){
        return this.Email;
    }
    getPassword(){
        return this.Password;
    }
    getRole(){
        return this.Role;
    }
    getPhone(){
        return this.Phone;
    }
}

module.exports = Users;