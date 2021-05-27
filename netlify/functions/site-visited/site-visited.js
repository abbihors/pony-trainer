const handler = async (event) => {
    console.log(`Got visitor at: ${new Date().toLocaleString()}`);

    return {
        statusCode: 200
    }
}

module.exports = { handler }
