import React from 'react'
import Footer from './components/footer'
import Header from './components/header'
import EditEssayContent from './editEssayContent/editEssayContent'

class Root extends React.Component {
    render() {
        return (
            <div id="container">
                <Header/>
                <EditEssayContent/>
                <Footer/>
            </div>
        );
    }
}

export default Root;