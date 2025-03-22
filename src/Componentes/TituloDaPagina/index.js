import './TituloDaPagina.css'

const TituloDaPagina = ({ titulo }) => {
    return(
        <section className="titulo-da-pagina"> 
            <p>{ titulo }</p>
        </section>
    )
}

export default TituloDaPagina;