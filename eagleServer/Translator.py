class Translator:

    def __init__(self):
        print("new translator")
        self.algorithm = None


    def setPartitioningAlgorithm(self, algorithm):
        self.algorithm = algorithm


    def translate(self, logicalGraph):
        print("translate")

        # unroll
        physicalGraphTemplate = self.unroll(logicalGraph)

        # partition
        self.algorithm.partition(physicalGraphTemplate)

        return physicalGraphTemplate

    def unroll(self, logicalGraph):
        return {"Physical Graph Template": "Placeholder from Translator.translate()"}
